'use client';

import { useEffect, useRef, useCallback, useState, WheelEvent, MouseEvent as RMouseEvent } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/lib/ThemeContext';
import { Network, Layers, GitMerge, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/* ── Lazy-load the heavy React Flow graph (SSR-safe) ─────────── */
const ReactFlowGraph = dynamic(() => import('./ArchitectureGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[420px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        <p className="text-[10px] font-mono text-gray-500">Loading node network…</p>
      </div>
    </div>
  ),
});

/* ─────────────────────────── Types ──────────────────────────── */
interface GraphNode {
  id: string;
  data: { path: string; loc?: number; complexity?: number; extension?: string; importsCount?: number; [key: string]: any };
  [key: string]: any;
}
interface GraphEdge { id: string; source: string; target: string; [key: string]: any; }
interface MermaidArchitectureProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  arch?: any;
  onNodeClick: (nodeData: any) => void;
}

/* ─────────────────────── Mermaid helpers ────────────────────── */
function safeId(id: string): string { return 'n' + id.replace(/[^a-zA-Z0-9]/g, ''); }
function safeLabel(s: string): string { return s.replace(/"/g, "'").replace(/[<>{}|[\]]/g, ' ').trim(); }
function filename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1] || path;
  return name.length > 26 ? name.slice(0, 23) + '…' : name;
}
function topDir(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.length > 1 ? parts[0] : '(root)';
}

/* ── Overview: directory-level flowchart ────────────────────── */
function buildOverviewDef(nodes: GraphNode[], edges: GraphEdge[], arch: any): string {
  const dirToIds: Record<string, string[]> = {};
  const idToDir: Record<string, string> = {};
  nodes.forEach(n => {
    const dir = topDir(n.data.path || '');
    if (!dirToIds[dir]) dirToIds[dir] = [];
    dirToIds[dir].push(n.id);
    idToDir[n.id] = dir;
  });

  const dirEdgeCounts: Record<string, number> = {};
  edges.forEach(e => {
    const srcDir = idToDir[e.source];
    const tgtDir = idToDir[e.target];
    if (srcDir && tgtDir && srcDir !== tgtDir) {
      const key = `${srcDir}||${tgtDir}`;
      dirEdgeCounts[key] = (dirEdgeCounts[key] || 0) + 1;
    }
  });

  const dirEdges = Object.entries(dirEdgeCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([key, count]) => { const [src, tgt] = key.split('||'); return { src, tgt, count }; });

  const activeDirs = new Set<string>();
  dirEdges.forEach(e => { activeDirs.add(e.src); activeDirs.add(e.tgt); });
  Object.keys(dirToIds).slice(0, 8).forEach(d => activeDirs.add(d));

  const dirToNodeId: Record<string, string> = {};
  [...activeDirs].forEach((dir, i) => { dirToNodeId[dir] = `D${i}`; });

  const nodeLines = [...activeDirs].map(dir => {
    const count = (dirToIds[dir] || []).length;
    return `  ${dirToNodeId[dir]}["${safeLabel(dir)} (${count})"]`;
  });

  const edgeLines = dirEdges
    .filter(e => dirToNodeId[e.src] && dirToNodeId[e.tgt])
    .map(e => `  ${dirToNodeId[e.src]} -->|"${e.count}"| ${dirToNodeId[e.tgt]}`);

  // Arch layer chain
  let archChain = '';
  if (arch?.layers?.length > 1) {
    const ln = arch.layers.slice(0, 5).map((l: string, i: number) => `  LAY${i}["${safeLabel(l)}"]`);
    const le = arch.layers.slice(0, 4).map((_: any, i: number) => `  LAY${i} --> LAY${i + 1}`);
    archChain = ln.join('\n') + '\n' + le.join('\n') + '\n';
  }

  return `flowchart LR\n${archChain}${nodeLines.join('\n')}\n${edgeLines.join('\n')}`;
}

/* ── Expanded: file-level, top 40 by complexity ─────────────── */
function buildExpandedDef(nodes: GraphNode[], edges: GraphEdge[]): string {
  const sorted = [...nodes].sort((a, b) => (b.data.complexity || 0) - (a.data.complexity || 0));
  const topNodes = sorted.slice(0, 40);
  const topIds = new Set(topNodes.map(n => n.id));

  // Build a lookup: safeId(node.id) → node.id for click deref
  const clickLines = topNodes.map(n => `  click ${safeId(n.id)} archonNodeClick`);

  const nodeDefs = topNodes.map(n => `  ${safeId(n.id)}["${safeLabel(filename(n.data.path))}"]`);
  const edgeDefs = edges.filter(e => topIds.has(e.source) && topIds.has(e.target))
    .slice(0, 120).map(e => `  ${safeId(e.source)} --> ${safeId(e.target)}`);

  return `flowchart LR\n${nodeDefs.join('\n')}\n${edgeDefs.join('\n')}\n${clickLines.join('\n')}`;
}

/* ── Mermaid theme ───────────────────────────────────────────── */
function getMermaidThemeVars(theme: string) {
  return theme === 'light'
    ? { primaryColor: '#d4e8d0', primaryTextColor: '#1a2820', primaryBorderColor: '#618764', lineColor: '#618764', background: '#faf8f4', mainBkg: '#e8f0e6', nodeBorder: '#618764', edgeLabelBackground: '#faf8f4', fontFamily: 'Outfit, Inter, system-ui, sans-serif' }
    : { primaryColor: '#2d1b5e', primaryTextColor: '#e2d9f3', primaryBorderColor: '#7c3aed', lineColor: '#7c3aed', background: '#0a0d0f', mainBkg: '#1a1230', nodeBorder: '#7c3aed', edgeLabelBackground: '#0f0a1e', fontFamily: 'Outfit, Inter, system-ui, sans-serif' };
}

/* ── View modes ──────────────────────────────────────────────── */
type ViewMode = 'overview' | 'expanded' | 'network';
const VIEW_MODES = [
  { id: 'overview' as ViewMode, label: 'Overview', icon: Layers,   hint: 'Directory-level architecture flow' },
  { id: 'expanded' as ViewMode, label: 'Expanded', icon: GitMerge, hint: 'Top 40 files by complexity · click to inspect' },
  { id: 'network'  as ViewMode, label: 'Network',  icon: Network,  hint: 'Interactive node network · drag & zoom' },
];

/* ─────────────────────── Component ──────────────────────────── */
export default function MermaidArchitecture({ nodes, edges, arch, onNodeClick }: MermaidArchitectureProps) {
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Pan/zoom state for Expanded
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // ID → data for click handlers
  const idToData = useRef<Record<string, any>>({});
  useEffect(() => {
    nodes.forEach(n => { idToData.current[safeId(n.id)] = n.data; });
  }, [nodes]);

  /* ── Mermaid click callback (called by Mermaid onclick attr) ── */
  useEffect(() => {
    (window as any).archonNodeClick = (nodeId: string) => {
      const data = idToData.current[nodeId];
      if (data) onNodeClick(data);
    };
  }, [onNodeClick]);

  /* ── Render Mermaid ─────────────────────────────────────────── */
  const renderMermaid = useCallback(async () => {
    if (viewMode === 'network') return;
    if (!mermaidContainerRef.current || nodes.length === 0) return;
    mermaidContainerRef.current.innerHTML = '';
    setScale(1);
    setOffset({ x: 0, y: 0 });

    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: theme === 'light' ? 'default' : 'dark',
      themeVariables: getMermaidThemeVars(theme),
      flowchart: { htmlLabels: true, curve: 'basis' },
    });

    const def = viewMode === 'overview'
      ? buildOverviewDef(nodes, edges, arch)
      : buildExpandedDef(nodes, edges);

    try {
      const uid = `mermaid-${viewMode}-${Date.now()}`;
      const { svg } = await mermaid.render(uid, def);
      if (mermaidContainerRef.current) {
        mermaidContainerRef.current.innerHTML = svg;
        // Remove hardcoded dimensions so the SVG fills naturally
        const svgEl = mermaidContainerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.style.width  = '100%';
          svgEl.style.height = 'auto';
        }
      }
    } catch (err) {
      console.error('[Mermaid]', err);
      if (mermaidContainerRef.current) {
        mermaidContainerRef.current.innerHTML = `<div style="padding:1rem;color:#ef4444;font-family:monospace;font-size:0.7rem;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:8px;margin:1rem;">⚠ Render error — ${String(err).slice(0, 200)}</div>`;
      }
    }
  }, [nodes, edges, arch, theme, viewMode]);

  useEffect(() => { renderMermaid(); }, [renderMermaid]);

  /* ── Pan/Zoom handlers (Expanded only) ──────────────────────── */
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (viewMode !== 'expanded') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(Math.max(s * delta, 0.3), 4));
  }, [viewMode]);

  const handleMouseDown = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'expanded') return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [viewMode, offset]);

  const handleMouseMove = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }, []);

  const stopDrag = useCallback(() => { isDragging.current = false; }, []);

  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const activeMode = VIEW_MODES.find(m => m.id === viewMode)!;

  return (
    <div className="relative h-full w-full min-h-[420px] flex flex-col overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden">
          {VIEW_MODES.map((mode, i) => {
            const Icon = mode.icon;
            const active = viewMode === mode.id;
            return (
              <button key={mode.id} onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wide transition-colors
                  ${i < VIEW_MODES.length - 1 ? 'border-r border-white/8' : ''}
                  ${active ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Icon className="h-3 w-3" />{mode.label}
              </button>
            );
          })}
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-lg px-2.5 py-1.5">
          <p className="text-[10px] text-gray-500 font-mono">{activeMode.hint}</p>
        </div>
      </div>

      {/* ── Zoom controls (Expanded only) ───────────────────── */}
      {viewMode === 'expanded' && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
          <button onClick={() => setScale(s => Math.min(s * 1.2, 4))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setScale(s => Math.max(s / 1.2, 0.3))} className="h-7 w-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button onClick={resetView} className="h-7 w-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
          <span className="text-[9px] font-mono text-gray-600 text-center">{Math.round(scale * 100)}%</span>
        </div>
      )}

      {/* ── Network (React Flow) ─────────────────────────────── */}
      {viewMode === 'network' && (
        <div className="flex-1 min-h-[420px]">
          <ReactFlowGraph nodes={nodes as any} edges={edges as any} onNodeClick={onNodeClick} />
        </div>
      )}

      {/* ── Mermaid: Overview (natural scroll) ──────────────── */}
      {viewMode === 'overview' && (
        <div className="flex-1 overflow-auto pt-12 p-4" style={{ minHeight: 420 }}>
          <div ref={mermaidContainerRef} className="mermaid-wrapper min-w-0" />
        </div>
      )}

      {/* ── Mermaid: Expanded (pan + zoom canvas) ───────────── */}
      {viewMode === 'expanded' && (
        <div
          className="flex-1 overflow-hidden pt-12 cursor-grab active:cursor-grabbing select-none"
          style={{ minHeight: 420 }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          ref={svgWrapperRef}
        >
          <div
            ref={mermaidContainerRef}
            className="mermaid-wrapper origin-top-left"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: isDragging.current ? 'none' : 'transform 80ms ease-out',
              width: 'max-content',
              minWidth: '100%',
            }}
          />
        </div>
      )}
    </div>
  );
}
