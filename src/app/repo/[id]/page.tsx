'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navigation from '@/components/Navigation';
import { 
  Layers, 
  Compass, 
  Clock, 
  ShieldAlert, 
  LineChart, 
  Terminal, 
  FileCode2, 
  CheckCircle,
  HelpCircle,
  X,
  Code2,
  FolderOpen,
  ArrowLeft,
  Loader2
} from 'lucide-react';

const ArchitectureGraph = dynamic(() => import('@/components/ArchitectureGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[550px] w-full items-center justify-center rounded-xl bg-black/20 border border-white/5">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-gray-500 font-mono">Drawing architecture nodes and edges...</p>
      </div>
    </div>
  )
});

type TabType = 'architecture' | 'onboarding' | 'story' | 'debt' | 'security';

export default function RepoDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const repoId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('architecture');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected file states
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    async function fetchRepoDetails() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/repos/${repoId}`);
        if (!res.ok) throw new Error('Repository details not found');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to load repo details', err);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRepoDetails();
  }, [repoId, router]);

  const handleNodeClick = async (nodeData: any) => {
    setIsFileLoading(true);
    setSelectedFile(nodeData);
    setFileContent('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/files?path=${encodeURIComponent(nodeData.path)}`);
      if (res.ok) {
        const fileDetail = await res.json();
        setFileContent(fileDetail.content);
        setSelectedFile((prev: any) => ({ ...prev, ...fileDetail }));
      }
    } catch (e) {
      console.error('Failed to fetch file content', e);
    } finally {
      setIsFileLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <Navigation />
        <div className="flex-1 flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            <p className="text-sm text-gray-500 font-mono">Analyzing codebase representations...</p>
          </div>
        </div>
      </div>
    );
  }

  const { repository, reports, graph } = data;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navigation />

      {/* Repository Hero Headers */}
      <section className="border-b border-[var(--card-border)] bg-black/20 py-6">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="pressable-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">{repository.name}</h1>
                <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                  {repository.frameworks?.[0] || 'App'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">{repository.githubUrl}</p>
            </div>
          </div>

          <div className="flex gap-6 text-xs font-mono text-gray-400">
            <div>
              <span className="block text-gray-600 uppercase text-[9px]">LOC</span>
              <span className="font-semibold text-gray-300">{repository.stats?.loc?.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-gray-600 uppercase text-[9px]">Files</span>
              <span className="font-semibold text-gray-300">{repository.stats?.fileCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tab Wrapper */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Tab Sidebar */}
        <aside className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'architecture', label: 'Architecture', icon: Layers },
            { id: 'onboarding', label: 'Onboarding', icon: Compass },
            { id: 'story', label: 'Project Story', icon: Clock },
            { id: 'debt', label: 'Technical Debt', icon: LineChart },
            { id: 'security', label: 'Security & Perf', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSelectedFile(null);
                }}
                className={`pressable-btn flex items-center gap-2.5 rounded-lg px-4 py-3 text-xs font-semibold w-full whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-[var(--primary-glow)] to-[var(--secondary-glow)] border border-purple-500/20 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-purple-400' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Tab Content Display Area */}
        <main className="flex-1 min-w-0 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden flex flex-col min-h-[500px]">
          
          {/* ARCHITECTURE GRAPH TAB */}
          {activeTab === 'architecture' && (
            <div className="flex-1 flex flex-col md:flex-row relative">
              <div className="flex-1 relative min-h-[500px]">
                <ArchitectureGraph 
                  nodes={graph.nodes} 
                  edges={graph.edges} 
                  onNodeClick={handleNodeClick} 
                />
              </div>

              {/* Slide-out File Detail Drawer */}
              {selectedFile && (
                <div className="w-full md:w-[350px] shrink-0 border-t md:border-t-0 md:border-l border-[var(--card-border)] bg-black/40 backdrop-blur-md flex flex-col justify-between h-[500px] md:h-auto overflow-hidden animate-[slideIn_200ms_var(--ease-out-premium)]">
                  {/* Drawer Header */}
                  <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
                    <div className="overflow-hidden">
                      <h3 className="text-xs font-bold text-white truncate font-mono">{selectedFile.path.split('/').pop()}</h3>
                      <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">{selectedFile.path}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedFile(null)}
                      className="pressable-btn flex h-6 w-6 items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-semibold">LOC</span>
                        <span className="text-xs font-bold text-gray-300 font-mono">{selectedFile.loc}</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-semibold">Complexity</span>
                        <span className="text-xs font-bold text-gray-300 font-mono">{selectedFile.complexity}</span>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded p-2 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-semibold">Imports</span>
                        <span className="text-xs font-bold text-gray-300 font-mono">{selectedFile.importsCount || 0}</span>
                      </div>
                    </div>

                    {/* Parser Extracted counts */}
                    {(selectedFile.functionsCount > 0 || selectedFile.classesCount > 0) && (
                      <div className="flex gap-2">
                        {selectedFile.functionsCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[9px] font-semibold border border-purple-500/20 text-purple-400">
                            <Code2 className="h-2.5 w-2.5" /> {selectedFile.functionsCount} Functions
                          </span>
                        )}
                        {selectedFile.classesCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold border border-blue-500/20 text-blue-400">
                            <FolderOpen className="h-2.5 w-2.5" /> {selectedFile.classesCount} Classes
                          </span>
                        )}
                      </div>
                    )}

                    {/* Code Snippet Box */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-semibold uppercase tracking-wider text-gray-500">Source Code Snippet</label>
                      {isFileLoading ? (
                        <div className="h-[200px] bg-black/50 border border-white/5 rounded flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                        </div>
                      ) : (
                        <pre className="p-3 bg-black/50 border border-white/5 rounded text-[10px] font-mono text-gray-400 max-h-[220px] overflow-y-auto overflow-x-auto whitespace-pre">
                          {fileContent || '// Source empty or unparsed'}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ONBOARDING FLOW TAB */}
          {activeTab === 'onboarding' && (
            <div className="p-8 space-y-8 fade-in-up">
              <div>
                <h2 className="text-xl font-bold text-white">Codebase Onboarding Path</h2>
                <p className="text-xs text-gray-400 mt-1">Recommended files and learning steps generated by AI to ramp up fast.</p>
              </div>

              {/* Path timeline */}
              <div className="grid gap-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">1. Reading List Sequence</h3>
                <div className="space-y-3">
                  {reports.onboarding?.readingList?.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/15 transition-all">
                      <div className="h-6 w-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{item.path}</span>
                          <span className={`inline-flex px-1.5 py-0.2 rounded text-[8px] font-bold ${
                            item.priority === 'High' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {item.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup commands */}
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">2. Development Setup Steps</h3>
                  <ul className="space-y-2">
                    {reports.onboarding?.setupSteps?.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-sans">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">3. Navigation Tips</h3>
                  <ul className="space-y-2">
                    {reports.onboarding?.architectureTips?.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-sans">
                        <HelpCircle className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT STORY TAB */}
          {activeTab === 'story' && (
            <div className="p-8 space-y-8 fade-in-up">
              <div>
                <h2 className="text-xl font-bold text-white">Project Evolution Story</h2>
                <p className="text-xs text-gray-400 mt-1">Timeline reconstruction clustering historical commits into architectural themes.</p>
              </div>

              {reports.history?.evolutionSummary && (
                <div className="bg-white/5 border border-white/5 rounded-lg p-4 text-xs text-gray-300 leading-relaxed italic">
                  &ldquo;{reports.history.evolutionSummary}&rdquo;
                </div>
              )}

              {/* Timeline layout */}
              <div className="relative border-l border-purple-500/10 pl-6 ml-3 space-y-6">
                {reports.history?.timeline?.map((item: any, idx: number) => (
                  <div key={idx} className="relative">
                    {/* Node Dot */}
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--background)] bg-purple-500 shadow-md shadow-purple-500/20" />
                    
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{item.theme}</h4>
                        <span className="text-[10px] text-gray-500 font-mono font-semibold">({item.timePeriod})</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{item.explanation}</p>
                      
                      {item.affectedFiles && item.affectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.affectedFiles.map((f: string) => (
                            <span key={f} className="font-mono text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TECHNICAL DEBT TAB */}
          {activeTab === 'debt' && (
            <div className="p-8 space-y-8 fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Technical Debt Assessment</h2>
                  <p className="text-xs text-gray-400 mt-1">Automated analysis of code quality limits, branching hot spots, and warnings.</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg px-4 py-2.5 text-center">
                  <span className="block text-[8px] text-gray-500 uppercase font-semibold">Debt Index</span>
                  <span className="text-lg font-bold text-rose-400 font-mono">
                    {Math.round((reports.techDebt?.complexityRatio || 0.5) * 100)}%
                  </span>
                </div>
              </div>

              {/* Hotspots Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Refactoring Hotspots</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {reports.techDebt?.hotspots?.map((hotspot: any, idx: number) => (
                    <div key={idx} className="glass-panel border-rose-950/20 hover:border-rose-500/20 rounded-lg p-5 space-y-2">
                      <span className="block text-xs font-mono font-bold text-rose-400 truncate">{hotspot.path}</span>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase">{hotspot.metric}</p>
                      <p className="text-xs text-gray-300 mt-2">{hotspot.impact}</p>
                      <div className="pt-2.5 mt-2 border-t border-white/5 text-xs text-gray-400 font-sans italic">
                        <strong>Refactor Step:</strong> {hotspot.refactoringStep}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General recommendations */}
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">General Code Quality recommendations</h3>
                  <ul className="space-y-2">
                    {reports.techDebt?.generalRecommendations?.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-sans">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Dead Code opportunities</h3>
                  <ul className="space-y-2">
                    {reports.techDebt?.deadCodeOpportunities?.map((opp: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-sans">
                        <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY & PERFORMANCE TAB */}
          {activeTab === 'security' && (
            <div className="p-8 space-y-8 fade-in-up">
              <div>
                <h2 className="text-xl font-bold text-white">Security & Performance Audit</h2>
                <p className="text-xs text-gray-400 mt-1">AI agent reports checking static vulnerability patterns and bundle bottlenecks.</p>
              </div>

              {/* Vulnerabilities Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vulnerability Warnings</h3>
                {reports.security?.vulnerabilities && reports.security.vulnerabilities.length > 0 ? (
                  <div className="space-y-3">
                    {reports.security.vulnerabilities.map((vuln: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white uppercase">
                              {vuln.severity} Severity
                            </span>
                            <span className="text-xs font-bold text-white">{vuln.category}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{vuln.description}</p>
                        <div className="text-xs text-gray-400 pt-2 border-t border-white/5">
                          <strong>Mitigation:</strong> {vuln.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/5 rounded-lg p-5 text-center text-xs text-gray-500">
                    No high-priority vulnerabilities matched in static AST parsing checks.
                  </div>
                )}
              </div>

              {/* Best practices checklist */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Best Practices recommendations</h3>
                <ul className="space-y-2.5">
                  {reports.security?.bestPracticesAdherence?.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300 font-sans">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* SlideIn CSS animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
