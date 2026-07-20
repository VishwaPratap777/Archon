'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Network, Layers, ChevronDown, ChevronUp } from 'lucide-react';

/* ─────────────────────────── Types ──────────────────────────── */
interface GraphNode {
  id: string; // MongoDB _id
  data: {
    path: string;
    loc?: number;
    complexity?: number;
    extension?: string;
    importsCount?: number;
    functionsCount?: number;
    classesCount?: number;
    [key: string]: any;
  };
}

interface GraphEdge {
  id: string;
  source: string; // MongoDB _id
  target: string; // MongoDB _id
}

interface MermaidArchitectureProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  arch?: any;          // reports.architecture — for overview mode
  onNodeClick: (nodeData: any) => void;
}

/* ─────────────────────── Safe Mermaid ID ────────────────────── */
// MongoDB IDs are hex strings — prefix with 'n' to ensure they start with a letter
function safeId(id: string): string {
  return 'n' + id.replace(/[^a-zA-Z0-9]/g, '');
}

function safeLabel(s: string): string {
  return s.replace(/"/g, "'").replace(/[<>{}|]/g, ' ').trim();
}

function filename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1] || path;
  return name.length > 26 ? name.slice(0, 23) + '…' : name;
}

function topDir(path: string): string {
  const p = path.replace(/\\/g, '/');
  const parts = p.split('/');
  return parts.length > 1 ? parts[0] : '(root)';
}

/* ─────────────────── OVERVIEW diagram builder ───────────────── */
/**
 * Groups files by top-level directory, then builds edges between
 * directories based on actual file-level import connections.
 * Results in a compact ~5–10 node "architectural" flowchart.
 */
function buildOverviewDef(nodes: GraphNode[], edges: GraphEdge[], arch: any): string {
  // 1. Group node IDs by top-level directory
  const dirToIds: Record<string, string[]> = {};
  const idToDir: Record<string, string> = {};
  nodes.forEach(n => {
    const dir = topDir(n.data.path || '');
    if (!dirToIds[dir]) dirToIds[dir] = [];
    dirToIds[dir].push(n.id);
    idToDir[n.id] = dir;
  });

  const dirs = Object.keys(dirToIds);

  // 2. Build inter-directory edge counts
  const dirEdgeCounts: Record<string, number> = {};
  edges.forEach(e => {
    const srcDir = idToDir[e.source];
    const tgtDir = idToDir[e.target];
    if (srcDir && tgtDir && srcDir !== tgtDir) {
      const key = `${srcDir}||${tgtDir}`;
      dirEdgeCounts[key] = (dirEdgeCounts[key] || 0) + 1;
    }
  });

  // 3. Pick the strongest inter-directory connections (top 15)
  const dirEdges = Object.entries(dirEdgeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([key, count]) => {
      const [src, tgt] = key.split('||');
      return { src, tgt, count };
    });

  // 4. Determine which dirs are actually referenced
  const activeDirs = new Set<string>();
  dirEdges.forEach(e => { activeDirs.add(e.src); activeDirs.add(e.tgt); });
  // Also include dirs with the most files if they're isolated
  dirs.slice(0, 8).forEach(d => activeDirs.add(d));

  // 5. Generate Mermaid-safe IDs for dirs
  const dirToNodeId: Record<string, string> = {};
  [...activeDirs].forEach((dir, i) => {
    dirToNodeId[dir] = `D${i}`;
  });

  // 6. Emit node & edge lines
  const nodeLines = [...activeDirs].map(dir => {
    const count = (dirToIds[dir] || []).length;
    const label = safeLabel(`${dir}\\n(${count} files)`);
    return `  ${dirToNodeId[dir]}["${label}"]`;
  });

  const edgeLines = dirEdges
    .filter(e => dirToNodeId[e.src] && dirToNodeId[e.tgt])
    .map(e => `  ${dirToNodeId[e.src]} -->|"${e.count} imports"| ${dirToNodeId[e.tgt]}`);

  // 7. If arch has layers, add them as a chain at top
  let archChain = '';
  if (arch?.layers?.length > 1) {
    const layerNodes = arch.layers.slice(0, 5).map((l: string, i: number) =>
      `  LAY${i}["${safeLabel(l)}"]`
    );
    const layerEdges = arch.layers.slice(0, 4).map((_: any, i: number) =>
      `  LAY${i} --> LAY${i + 1}`
    );
    archChain = layerNodes.join('\n') + '\n' + layerEdges.join('\n') + '\n';
  }

  return `flowchart LR\n${archChain}${nodeLines.join('\n')}\n${edgeLines.join('\n')}`;
}

/* ─────────────────── EXPANDED diagram builder ───────────────── */
/**
 * Shows the top N files by complexity, connected by their actual imports.
 * Uses MongoDB _id as the Mermaid node ID (prefixed with 'n') to ensure
 * source/target matching works correctly.
 */
function buildExpandedDef(nodes: GraphNode[], edges: GraphEdge[]): string {
  // Limit to 40 highest-complexity files for legibility
  const sorted = [...nodes].sort((a, b) =>
    (b.data.complexity || 0) - (a.data.complexity || 0)
  );
  const topNodes = sorted.slice(0, 40);
  const topIds = new Set(topNodes.map(n => n.id));

  const nodeDefs = topNodes.map(n => {
    const id = safeId(n.id);
    const label = safeLabel(filename(n.data.path));
    return `  ${id}["${label}"]`;
  });

  const edgeDefs = edges
    .filter(e => topIds.has(e.source) && topIds.has(e.target))
    .slice(0, 100)
    .map(e => `  ${safeId(e.source)} --> ${safeId(e.target)}`);

  const clickDefs = topNodes.map(n => `  click ${safeId(n.id)} archonNodeClick`);

  return `flowchart LR\n${nodeDefs.join('\n')}\n${edgeDefs.join('\n')}\n${clickDefs.join('\n')}`;
}

/* ─────────────────────── Mermaid theme ──────────────────────── */
function getMermaidThemeVars(theme: string) {
  return theme === 'light'
    ? {
        primaryColor: '#d4e8d0',
        primaryTextColor: '#1a2820',
        primaryBorderColor: '#618764',
        lineColor: '#618764',
        background: '#faf8f4',
        mainBkg: '#e8f0e6',
        nodeBorder: '#618764',
        edgeLabelBackground: '#faf8f4',
        fontFamily: 'Outfit, Inter, system-ui, sans-serif',
      }
    : {
        primaryColor: '#2d1b5e',
        primaryTextColor: '#e2d9f3',
        primaryBorderColor: '#7c3aed',
        lineColor: '#7c3aed',
        background: '#0a0d0f',
        mainBkg: '#1a1230',
        nodeBorder: '#7c3aed',
        edgeLabelBackground: '#0f0a1e',
        fontFamily: 'Outfit, Inter, system-ui, sans-serif',
      };
}

/* ──────────────────────── Component ─────────────────────────── */
type ViewMode = 'overview' | 'expanded';

export default function MermaidArchitecture({
  nodes,
  edges,
  arch,
  onNodeClick,
}: MermaidArchitectureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // ID→data lookup for click handlers (only needed in expanded mode)
  const idToData = useRef<Record<string, any>>({});
  useEffect(() => {
    nodes.forEach(n => {
      idToData.current[safeId(n.id)] = n.data;
    });
  }, [nodes]);

  const render = useCallback(async () => {
    if (!containerRef.current || nodes.length === 0) return;
    containerRef.current.innerHTML = ''; // clear previous render

    const mermaid = (await import('mermaid')).default;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: theme === 'light' ? 'default' : 'dark',
      themeVariables: getMermaidThemeVars(theme),
      flowchart: { htmlLabels: true, curve: 'basis' },
    });

    // Register global click handler
    (window as any).archonNodeClick = (nodeId: string) => {
      const data = idToData.current[nodeId];
      if (data) onNodeClick(data);
    };

    const def = viewMode === 'overview'
      ? buildOverviewDef(nodes, edges, arch)
      : buildExpandedDef(nodes, edges);

    const uid = `mermaid-${viewMode}-${Date.now()}`;
    try {
      const { svg } = await mermaid.render(uid, def);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.style.minHeight = '380px';
          svgEl.style.maxHeight = viewMode === 'expanded' ? '800px' : '500px';
        }
      }
    } catch (err) {
      console.error('[Mermaid] render error:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding:1.5rem;color:#ef4444;font-family:monospace;font-size:0.7rem;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:8px;margin:1rem;">
            ⚠ Diagram render error — ${String(err).slice(0, 200)}
          </div>`;
      }
    }
  }, [nodes, edges, arch, theme, viewMode, onNodeClick]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className="relative h-full w-full min-h-[420px] flex flex-col">

      {/* ── Toolbar ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border border-white/10 bg-black/50 backdrop-blur-md overflow-hidden">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wide transition-colors ${
              viewMode === 'overview'
                ? 'bg-purple-500/20 text-purple-300 border-r border-purple-500/20'
                : 'text-gray-500 hover:text-gray-300 border-r border-white/5'
            }`}
          >
            <Layers className="h-3 w-3" />
            Overview
          </button>
          <button
            onClick={() => setViewMode('expanded')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wide transition-colors ${
              viewMode === 'expanded'
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Network className="h-3 w-3" />
            Expanded
          </button>
        </div>

        {/* Context hint */}
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-lg px-2.5 py-1.5">
          <p className="text-[10px] text-gray-500 font-mono">
            {viewMode === 'overview'
              ? 'Directory-level architecture flow'
              : `Top ${Math.min(40, nodes.length)} files by complexity · click to inspect`}
          </p>
        </div>
      </div>

      {/* ── Diagram ── */}
      <div
        ref={containerRef}
        className="mermaid-wrapper flex-1 overflow-auto p-4 pt-14"
        style={{ minHeight: 420 }}
      />
    </div>
  );
}
