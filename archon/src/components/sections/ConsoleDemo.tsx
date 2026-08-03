'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Cpu, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

const mockFiles = [
  {
    name: 'parser.ts',
    tokens: 284,
    complexity: 12,
    ast: {
      type: 'Program',
      body: [
        { type: 'ImportDeclaration', source: 'web-tree-sitter' },
        { type: 'ClassDeclaration', name: 'ASTParser', methods: ['init', 'parse', 'extractImports'] }
      ]
    },
    code: `import Parser from 'web-tree-sitter';

export class ASTParser {
  private parser: Parser;

  async init() {
    await Parser.init();
    this.parser = new Parser();
  }

  parse(source: string) {
    return this.parser.parse(source);
  }
}`
  },
  {
    name: 'git.ts',
    tokens: 412,
    complexity: 18,
    ast: {
      type: 'Program',
      body: [
        { type: 'ImportDeclaration', source: 'child_process' },
        { type: 'FunctionDeclaration', name: 'getCommitLineage', params: ['filePath'] }
      ]
    },
    code: `import { execSync } from 'child_process';

export function getCommitLineage(filePath: string) {
  const log = execSync(\`git log --follow --format="%H|%an|%ad|%s" -- \${filePath}\`);
  return log.toString().trim().split('\\n').map(line => {
    const [hash, author, date, message] = line.split('|');
    return { hash, author, date, message };
  });
}`
  },
  {
    name: 'agents.ts',
    tokens: 920,
    complexity: 34,
    ast: {
      type: 'Program',
      body: [
        { type: 'ImportDeclaration', source: '@anthropic-ai/sdk' },
        { type: 'ClassDeclaration', name: 'DecisionalAgent', methods: ['analyzeAST', 'reconstructDecision'] }
      ]
    },
    code: `import Anthropic from '@anthropic-ai/sdk';

export class DecisionalAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async reconstructDecision(ast: string, diff: string) {
    // Generate context-aware architectural explanation
    return this.client.messages.create({ ... });
  }
}`
  }
];

// Helper for toolbar actions
const toolbarActions = [
  { id: 'parse', label: 'Parse AST', icon: Code, tooltip: 'Reconstruct AST tree-sitter nodes' },
  { id: 'compile', label: 'Verify Graph', icon: Cpu, tooltip: 'Analyze dependency map references' },
  { id: 'refresh', label: 'Sync Git', icon: RefreshCw, tooltip: 'Trace commit lineage' }
];

export default function ConsoleDemo() {
  const [selectedFile, setSelectedFile] = useState(mockFiles[0]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // Shared state to skip tooltip delay on subsequent hovers
  const [globalTooltipActive, setGlobalTooltipActive] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tab Swap with Blur Masking
  const selectFile = (file: typeof mockFiles[0]) => {
    if (file.name === selectedFile.name) return;
    setIsTransitioning(true);
    // 160ms delay to blend the states using CSS blur filter
    setTimeout(() => {
      setSelectedFile(file);
      setIsTransitioning(false);
    }, 160);
  };

  // Tooltip Hover Logic (Skip delay on subsequent tooltips)
  const handleTooltipEnter = (id: string) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    
    if (globalTooltipActive) {
      // If another tooltip was just hovered, show this one instantly
      setActiveTooltip(id);
    } else {
      // Normal delay before showing
      tooltipTimeoutRef.current = setTimeout(() => {
        setActiveTooltip(id);
        setGlobalTooltipActive(true);
      }, 350);
    }
  };

  const handleTooltipLeave = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setActiveTooltip(null);
    
    // Maintain global active state for 800ms so subsequent hovers remain instant
    tooltipTimeoutRef.current = setTimeout(() => {
      setGlobalTooltipActive(false);
    }, 800);
  };

  return (
    <section id="demo" className="py-24 border-t border-black/5 relative z-10 px-6 max-w-7xl mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 w-[450px] h-[450px] rounded-full bg-[#618764]/4 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-4 mb-16">
        <h2 className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#618764] font-semibold">
          Console Interface
        </h2>
        <p className="font-sans font-semibold text-cream text-3xl md:text-5xl max-w-xl mx-auto leading-tight">
          Decisional AST visualizer.
        </p>
      </div>

      {/* Main Console Window */}
      <div className="glass-panel w-full rounded-2xl border border-black/5 bg-[rgba(255,255,255,0.3)] shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[500px]">
        
        {/* Left Side: File Explorer */}
        <div className="w-full md:w-64 border-r border-black/5 p-4 flex flex-col gap-2 bg-[#fcfbf9]/60 select-none">
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-cream-muted font-bold px-2.5 mb-2 block">
            Workspace Files
          </span>
          {mockFiles.map((file) => (
            <button
              key={file.name}
              onClick={() => selectFile(file)}
              className={`pressable-btn w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 text-xs font-mono border ${
                selectedFile.name === file.name
                  ? 'border-[#618764]/20 bg-[#618764]/5 text-[#2b5748]'
                  : 'border-transparent text-cream-dim hover:text-cream hover:bg-black/5'
              }`}
            >
              <FileText className="h-4 w-4 opacity-75" />
              {file.name}
            </button>
          ))}
        </div>

        {/* Right Side: Code & AST Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Workspace Toolbar */}
          <div className="border-b border-black/5 px-6 py-4 flex justify-between items-center bg-[#fcfbf9]/40">
            {/* Status indicators */}
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase text-cream-dim select-none">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Parsed
              </span>
              <span className="text-cream-muted">//</span>
              <span>Tokens: {selectedFile.tokens}</span>
              <span className="text-cream-muted">//</span>
              <span className="text-[#2b5748] font-semibold">Complexity: {selectedFile.complexity}</span>
            </div>

            {/* Action buttons with custom subsequent-hover tooltips */}
            <div className="flex gap-2">
              {toolbarActions.map((act) => {
                const Icon = act.icon;
                const isTooltipOpen = activeTooltip === act.id;
                
                return (
                  <div key={act.id} className="relative">
                    <button
                      onMouseEnter={() => handleTooltipEnter(act.id)}
                      onMouseLeave={handleTooltipLeave}
                      className="pressable-btn p-2.5 rounded-lg border border-black/5 bg-black/2.5 text-cream hover:text-[#2b5748] hover:bg-[#618764]/5 hover:border-[#618764]/10"
                    >
                      <Icon className="h-4 w-4" />
                    </button>

                    {/* Origin-Aware Tooltip (anchored transform-origin, dark pill) */}
                    <AnimatePresence>
                      {isTooltipOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            duration: globalTooltipActive ? 0 : 0.12, // Instant transition if global toggle is active
                            ease: [0.23, 1, 0.32, 1]
                          }}
                          style={{ transformOrigin: 'top center' }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#273338] text-white px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wider uppercase font-semibold whitespace-nowrap z-50 shadow-xl border border-white/5"
                        >
                          {act.tooltip}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Code Editor Panel (with transition blur masking) */}
          <div 
            className={`flex-1 p-6 font-mono text-xs overflow-auto bg-[#faf8f4]/20 transition-all duration-160 ${
              isTransitioning ? 'blur-[2px] opacity-70 scale-[0.995]' : 'blur-[0px] opacity-100 scale-100'
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              
              {/* Code Panel */}
              <div className="space-y-4">
                <span className="text-[9px] tracking-[0.2rem] uppercase text-cream-muted block select-none">
                  File Source
                </span>
                <pre className="text-[#273338] leading-relaxed p-4 rounded-xl border border-black/5 bg-[#fcfbf9] overflow-x-auto whitespace-pre no-scrollbar">
                  <code>{selectedFile.code}</code>
                </pre>
              </div>

              {/* AST Node Tree Preview */}
              <div className="space-y-4">
                <span className="text-[9px] tracking-[0.2rem] uppercase text-cream-muted block select-none">
                  AST Abstract Nodes
                </span>
                <div className="p-4 rounded-xl border border-black/5 bg-[#fcfbf9] flex flex-col gap-3 font-mono text-[#273338] text-[11px]">
                  <div className="flex items-center gap-2 text-[#2b5748]">
                    <span className="text-[#618764]">└─</span> Program
                  </div>
                  {selectedFile.ast.body.map((node, i) => (
                    <div key={i} className="pl-6 border-l border-black/5 flex flex-col gap-1.5 py-1">
                      <div className="flex items-center gap-2 text-[#0052a3]">
                        <span className="text-[#618764]">├─</span> {node.type}
                      </div>
                      <div className="pl-6 text-[10px] text-cream-muted">
                        {node.type === 'ImportDeclaration' ? (
                          <span>source: <span className="text-[#b25c00]">"{node.source}"</span></span>
                        ) : (
                          <div className="space-y-1">
                            <div>name: <span className="text-[#006f6b]">{node.name}</span></div>
                            {/* @ts-ignore */}
                            <div>methods: <span className="text-[#273338]">[{node.methods.join(', ')}]</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
