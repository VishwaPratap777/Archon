'use client';

import { Handle, Position } from '@xyflow/react';
import { FileCode, FileJson, Terminal, Layers, FileText } from 'lucide-react';

interface FileNodeProps {
  data: {
    path: string;
    loc: number;
    complexity: number;
    extension: string;
    importsCount: number;
  };
}

export default function FileNode({ data }: FileNodeProps) {
  const fileName = data.path.split('/').pop() || '';
  const folderPath = data.path.split('/').slice(0, -1).join('/');

  const getExtensionIcon = (ext: string) => {
    switch (ext) {
      case '.ts':
      case '.tsx':
        return <Layers className="h-4.5 w-4.5 text-blue-400" />;
      case '.js':
      case '.jsx':
        return <Terminal className="h-4.5 w-4.5 text-amber-400" />;
      case '.json':
        return <FileJson className="h-4.5 w-4.5 text-purple-400" />;
      case '.py':
        return <FileCode className="h-4.5 w-4.5 text-emerald-400" />;
      case '.go':
        return <FileCode className="h-4.5 w-4.5 text-cyan-400" />;
      default:
        return <FileText className="h-4.5 w-4.5 text-gray-500" />;
    }
  };

  const getComplexityColor = (comp: number) => {
    if (comp <= 4) return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
    if (comp <= 8) return 'border-amber-500/30 text-amber-400 bg-amber-500/5';
    return 'border-rose-500/30 text-rose-400 bg-rose-500/5';
  };

  const getComplexityBadgeLabel = (comp: number) => {
    if (comp <= 4) return 'Simple';
    if (comp <= 8) return 'Moderate';
    return 'Complex';
  };

  return (
    <div className="glass-panel group relative rounded-lg p-3.5 min-w-[200px] border border-white/5 hover:border-purple-500/30 transition-transform duration-200 hover:scale-[1.02]">
      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="!bg-purple-500/50 !w-2.5 !h-2.5 !border-0" />
      
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white/5 border border-white/5">
          {getExtensionIcon(data.extension)}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-purple-300 transition-colors">
            {fileName}
          </h4>
          {folderPath && (
            <p className="text-[9px] text-gray-500 truncate font-mono mt-0.5">{folderPath}/</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 gap-2">
        <span className="text-[9px] text-gray-400 font-mono">{data.loc} LOC</span>
        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-semibold border ${getComplexityColor(data.complexity)}`}>
          {getComplexityBadgeLabel(data.complexity)} ({data.complexity})
        </span>
      </div>

      {data.importsCount > 0 && (
        <div className="absolute -top-2.5 -right-2 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-purple-600 border border-purple-400 text-[8px] font-bold text-white shadow-md">
          {data.importsCount}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-purple-500/50 !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}
