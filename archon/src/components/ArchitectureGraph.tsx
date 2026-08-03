'use client';

import { useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import FileNode from './FileNode';

const nodeTypes = {
  fileNode: FileNode,
};

interface ArchitectureGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (nodeData: any) => void;
}

export default function ArchitectureGraph({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
}: ArchitectureGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync initial state updates
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <div className="h-full w-full relative min-h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node.data)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.04)" />
        <Controls 
          className="!bg-[var(--card-bg)] !border-[var(--card-border)] !text-white [&>button]:!bg-transparent [&>button]:!border-white/5 [&>button:hover]:!bg-white/5 [&>button>svg]:!fill-white" 
        />
        <MiniMap 
          className="!bg-[var(--card-bg)] !border-[var(--card-border)] [&_rect]:!fill-purple-500/10" 
          maskColor="rgba(0, 0, 0, 0.4)" 
          nodeColor={() => 'rgba(139, 92, 246, 0.2)'}
          nodeStrokeWidth={1}
          nodeBorderRadius={4}
        />
      </ReactFlow>
      
      {/* Help Banner overlay */}
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg px-3 py-1.5 pointer-events-none">
        <p className="text-[10px] text-gray-400 font-mono">
          Click any file node to inspect source metrics, functions, imports, and code structure.
        </p>
      </div>
    </div>
  );
}
