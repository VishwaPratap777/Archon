'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/ThemeContext';

interface GraphNode {
  id: string;
  data: {
    path: string;
    label?: string;
    loc?: number;
    complexity?: number;
    importsCount?: number;
    functionsCount?: number;
    classesCount?: number;
    [key: string]: any;
  };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface MermaidArchitectureProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeData: any) => void;
}

/** Sanitise a file path into a safe Mermaid node ID */
function toNodeId(path: string): string {
  return path.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '').slice(0, 40);
}

/** Shorten a path to a readable label */
function toLabel(path: string): string {
  const parts = path.split(/[\\/]/);
  const filename = parts[parts.length - 1] || path;
  // keep extension visible but cap total length
  return filename.length > 28 ? filename.slice(0, 25) + '…' : filename;
}

/**
 * Build a Mermaid flowchart LR definition string from the graph data.
 */
function buildMermaidDef(nodes: GraphNode[], edges: GraphEdge[]): string {
  const nodeSet = new Set(nodes.map(n => n.id));

  const nodeDefs = nodes.map(n => {
    const id = toNodeId(n.id);
    const label = toLabel(n.data.path || n.id);
    return `  ${id}["${label}"]`;
  });

  const edgeDefs = edges
    .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
    .slice(0, 120) // cap for readability
    .map(e => {
      const src = toNodeId(e.source);
      const tgt = toNodeId(e.target);
      return `  ${src} --> ${tgt}`;
    });

  return `flowchart LR\n${nodeDefs.join('\n')}\n${edgeDefs.join('\n')}`;
}

export default function MermaidArchitecture({
  nodes,
  edges,
  onNodeClick,
}: MermaidArchitectureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const renderedRef = useRef(false);

  // Map sanitised IDs back to original node data for click lookups
  const idToData = useRef<Record<string, any>>({});
  nodes.forEach(n => {
    idToData.current[toNodeId(n.id)] = n.data;
  });

  const render = useCallback(async () => {
    if (!containerRef.current || nodes.length === 0) return;

    const mermaid = (await import('mermaid')).default;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose', // required for click handlers
      theme: theme === 'light' ? 'default' : 'dark',
      themeVariables:
        theme === 'light'
          ? {
              primaryColor:      '#d4e8d0',
              primaryTextColor:  '#1a2820',
              primaryBorderColor:'#618764',
              lineColor:         '#618764',
              secondaryColor:    '#e8f5e2',
              tertiaryColor:     '#f5f2ec',
              background:        '#faf8f4',
              mainBkg:           '#e8f0e6',
              nodeBorder:        '#618764',
              clusterBkg:        '#f0f7ee',
              titleColor:        '#1a2820',
              edgeLabelBackground:'#faf8f4',
              fontFamily: 'Outfit, Inter, system-ui, sans-serif',
            }
          : {
              primaryColor:      '#2d1b5e',
              primaryTextColor:  '#e2d9f3',
              primaryBorderColor:'#7c3aed',
              lineColor:         '#7c3aed',
              secondaryColor:    '#1a1230',
              tertiaryColor:     '#0f0a1e',
              background:        '#0a0d0f',
              mainBkg:           '#1a1230',
              nodeBorder:        '#7c3aed',
              clusterBkg:        '#150f2a',
              titleColor:        '#e2d9f3',
              edgeLabelBackground:'#0f0a1e',
              fontFamily: 'Outfit, Inter, system-ui, sans-serif',
            },
    });

    // Build click callback registration lines
    const clickDefs = nodes
      .map(n => {
        const safeId = toNodeId(n.id);
        return `  click ${safeId} archonNodeClick`;
      })
      .join('\n');

    const def = buildMermaidDef(nodes, edges) + '\n' + clickDefs;

    // Expose global click handler for mermaid's click API
    (window as any).archonNodeClick = (nodeId: string) => {
      const data = idToData.current[nodeId];
      if (data) onNodeClick(data);
    };

    const uid = `mermaid-arch-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(uid, def);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        // Make the SVG fill its parent nicely
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
          svgEl.style.minHeight = '420px';
        }
      }
    } catch (err) {
      console.error('Mermaid render error:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding:2rem;color:#ef4444;font-family:monospace;font-size:0.75rem;">
            ⚠ Diagram render failed — too many nodes or cyclic dependency. 
            Try analysing a smaller subgraph.<br/><pre>${String(err).slice(0, 300)}</pre>
          </div>`;
      }
    }
  }, [nodes, edges, theme, onNodeClick]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="relative h-full w-full min-h-[420px] flex flex-col">
      {/* Help banner */}
      <div className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg px-3 py-1.5 pointer-events-none">
        <p className="text-[10px] text-gray-400 font-mono">
          Click any file node to inspect source metrics and code structure.
        </p>
      </div>

      {/* Diagram container — scroll both axes for large graphs */}
      <div
        ref={containerRef}
        className="mermaid-wrapper flex-1 overflow-auto p-6 pt-12"
        style={{ minHeight: 420 }}
      />
    </div>
  );
}
