'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navigation from '@/components/Navigation';
import { useTheme } from '@/lib/ThemeContext';
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
  Loader2,
  GitCommit,
  AlertTriangle,
  Cpu,
  BookOpen,
  TrendingUp,
  Shield,
  MessageSquare,
  Monitor,
  Server,
  Database,
  Key,
  FileText,
  Layout,
  Send
} from 'lucide-react';

const MermaidArchitecture = dynamic(() => import('@/components/MermaidArchitecture'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[500px] items-center justify-center rounded-xl bg-black/20 border border-white/5">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-gray-500 font-mono">Drawing architecture diagram...</p>
      </div>
    </div>
  )
});

type TabType = 'architecture' | 'onboarding' | 'story' | 'debt' | 'security' | 'chat';

const FormattedMessage = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-bold">{part}</strong> : <span key={i}>{part}</span>)}
    </>
  );
};

/* ── Small helper components ─────────────────────────────────── */

function SectionHeading({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-5">
      <Icon className="h-4.5 w-4.5 text-purple-400 shrink-0" />
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</h3>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-white/3 border border-white/5 p-6 text-center text-xs text-gray-500 italic">
      {msg}
    </div>
  );
}

/* ── Severity badge ──────────────────────────────────────────── */
const SEVERITY: Record<string, string> = {
  High:   'bg-rose-500/15 border-rose-500/30 text-rose-300',
  Medium: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  Low:    'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
};

export default function RepoDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const repoId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('architecture');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string>('');
  
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Hello! I am your Repository Intelligence Chatbot. Ask me anything about this codebase.' }
  ]);
  const [isChatting, setIsChatting] = useState(false);

  const { theme } = useTheme();

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${API_BASE}/api/repos/${repoId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: userMsg })
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Chat request failed');
      }
      
      setChatMessages(prev => [...prev, { role: 'ai', content: json.answer || JSON.stringify(json) }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'ai', content: `**Error:** ${err.message}` }]);
    } finally {
      setIsChatting(false);
    }
  };

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
  const arch = reports?.architecture || {};

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navigation />

      {/* ── Repository Hero Header ─────────────────────────────── */}
      <section className="border-b border-[var(--card-border)] bg-black/30 pt-24 pb-5">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="pressable-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">{repository.name}</h1>
                {repository.frameworks?.[0] && (
                  <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                    {repository.frameworks[0]}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-mono mt-0.5">{repository.githubUrl}</p>
            </div>
          </div>

          <div className="flex gap-6 text-xs font-mono text-gray-400">
            {repository.stats?.loc && (
              <div>
                <span className="block text-gray-600 uppercase text-[9px] tracking-wider">LOC</span>
                <span className="font-semibold text-gray-200">{repository.stats.loc.toLocaleString()}</span>
              </div>
            )}
            {repository.stats?.fileCount && (
              <div>
                <span className="block text-gray-600 uppercase text-[9px] tracking-wider">Files</span>
                <span className="font-semibold text-gray-200">{repository.stats.fileCount}</span>
              </div>
            )}
            {repository.frameworks?.length > 0 && (
              <div>
                <span className="block text-gray-600 uppercase text-[9px] tracking-wider">Stack</span>
                <span className="font-semibold text-gray-200">{repository.frameworks.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Layout ───────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 flex flex-col md:flex-row gap-6">

        {/* Tab Sidebar */}
        <aside className="w-full md:w-52 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {[
            { id: 'architecture', label: 'Architecture',   icon: Layers      },
            { id: 'onboarding',   label: 'Onboarding',     icon: Compass     },
            { id: 'story',        label: 'Project Story',  icon: Clock       },
            { id: 'debt',         label: 'Technical Debt', icon: LineChart   },
            { id: 'security',     label: 'Security',       icon: ShieldAlert },
            { id: 'chat',         label: 'Chat with Repo', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as TabType); setSelectedFile(null); }}
                className={`pressable-btn flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-semibold w-full whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-purple-500/10 border border-purple-500/25 text-white'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/4 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-purple-400' : 'text-gray-600'}`} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Tab Content */}
        <main className="flex-1 min-w-0 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden flex flex-col min-h-[600px]">

          {/* ══ ARCHITECTURE TAB ══════════════════════════════════ */}
          {activeTab === 'architecture' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-[600px]">
              {/* Graph pane */}
              <div className="flex-1 relative min-h-[420px]">
                <MermaidArchitecture
                  key={theme}
                  nodes={graph.nodes}
                  edges={graph.edges}
                  arch={arch}
                  onNodeClick={handleNodeClick}
                />
              </div>

              {/* Right panel — file detail OR arch assessment */}
              <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--card-border)] bg-black/30 flex flex-col overflow-hidden">
                {selectedFile ? (
                  /* File detail drawer */
                  <>
                    <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
                      <div className="overflow-hidden">
                        <h3 className="text-xs font-bold text-white truncate font-mono">{selectedFile.path.split('/').pop()}</h3>
                        <p className="text-[10px] text-gray-600 truncate font-mono mt-0.5">{selectedFile.path}</p>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="pressable-btn h-6 w-6 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {[['LOC', selectedFile.loc], ['Complexity', selectedFile.complexity], ['Imports', selectedFile.importsCount || 0]].map(([label, val]) => (
                          <div key={label} className="bg-white/4 border border-white/5 rounded p-2 text-center">
                            <span className="block text-[8px] text-gray-500 uppercase font-semibold">{label}</span>
                            <span className="text-xs font-bold text-gray-200 font-mono">{val}</span>
                          </div>
                        ))}
                      </div>

                      {(selectedFile.functionsCount > 0 || selectedFile.classesCount > 0) && (
                        <div className="flex gap-2 flex-wrap">
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

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-semibold uppercase tracking-wider text-gray-500">Source Preview</label>
                        {isFileLoading ? (
                          <div className="h-[200px] bg-black/40 border border-white/5 rounded flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                          </div>
                        ) : (
                          <pre className="p-3 bg-black/50 border border-white/5 rounded text-[10px] font-mono text-gray-400 max-h-[240px] overflow-y-auto overflow-x-auto whitespace-pre leading-relaxed">
                            {fileContent || '// Source empty or not yet parsed'}
                          </pre>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Architecture AI Assessment panel */
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="h-4 w-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">Architecture Assessment</h3>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Click any graph node to inspect source metrics. The AI assessment below is always visible.
                      </p>
                    </div>

                    {arch.description ? (
                      <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-4">
                        <p className="text-xs text-gray-300 leading-relaxed"><span className="font-bold text-purple-300">{arch.project_name}</span>: {arch.description}</p>
                      </div>
                    ) : (
                      <EmptyState msg="No architecture summary generated. Add an AI API key in Settings." />
                    )}

                    {arch.tech_stack?.length > 0 && (
                      <div>
                        <SectionHeading icon={Layers} label="Tech Stack" />
                        <div className="flex flex-wrap gap-1.5">
                          {arch.tech_stack.map((stackItem: string) => (
                            <span key={stackItem} className="inline-flex rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                              {stackItem}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {arch.frontend?.framework && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Monitor className="h-3.5 w-3.5 text-pink-400" />
                            <h4 className="text-xs font-bold text-white">Frontend</h4>
                          </div>
                          <ul className="space-y-1 text-[10px] text-gray-400">
                            <li><span className="text-gray-500">Framework:</span> {arch.frontend.framework}</li>
                            <li><span className="text-gray-500">Routing:</span> {arch.frontend.routing}</li>
                            <li><span className="text-gray-500">State:</span> {arch.frontend.state_management?.join(', ') || 'N/A'}</li>
                            <li><span className="text-gray-500">UI:</span> {arch.frontend.ui?.join(', ') || 'N/A'}</li>
                          </ul>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="h-3.5 w-3.5 text-blue-400" />
                            <h4 className="text-xs font-bold text-white">Backend</h4>
                          </div>
                          <ul className="space-y-1 text-[10px] text-gray-400">
                            <li><span className="text-gray-500">Framework:</span> {arch.backend?.framework}</li>
                            <li><span className="text-gray-500">Architecture:</span> {arch.backend?.architecture}</li>
                            <li><span className="text-gray-500">API Style:</span> {arch.backend?.api_style}</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {(arch.database?.provider || arch.authentication?.provider) && (
                      <div className="grid grid-cols-2 gap-3">
                        {arch.database?.provider && (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="h-3.5 w-3.5 text-emerald-400" />
                              <h4 className="text-xs font-bold text-white">Database</h4>
                            </div>
                            <ul className="space-y-1 text-[10px] text-gray-400">
                              <li><span className="text-gray-500">Provider:</span> {arch.database.provider}</li>
                              <li><span className="text-gray-500">ORM:</span> {arch.database.orm}</li>
                              <li><span className="text-gray-500">Models:</span> {arch.database.main_models?.join(', ')}</li>
                            </ul>
                          </div>
                        )}
                        {arch.authentication?.provider && (
                          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Key className="h-3.5 w-3.5 text-amber-400" />
                              <h4 className="text-xs font-bold text-white">Authentication</h4>
                            </div>
                            <p className="text-[10px] text-gray-400 line-clamp-3">
                              <span className="text-gray-500">Provider:</span> {arch.authentication.provider}
                              <br />
                              <span className="text-gray-500">Flow:</span> {arch.authentication.how_it_works}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {arch.important_files?.length > 0 && (
                      <div>
                        <SectionHeading icon={FileText} label="Important Files" />
                        <ul className="space-y-2">
                          {arch.important_files.map((file: any, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                              <FileCode2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-mono font-bold text-emerald-300">{file.path}</span>
                                <p className="text-gray-400 mt-0.5 text-[10px]">{file.reason}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {arch.developer_notes?.length > 0 && (
                      <div>
                        <SectionHeading icon={CheckCircle} label="Developer Notes" />
                        <ul className="space-y-2">
                          {arch.developer_notes.map((note: string, i: number) => (
                            <li key={i} className="flex gap-2 text-[11px] text-gray-300 leading-relaxed">
                              <span className="text-purple-400 font-mono font-bold shrink-0">{i + 1}.</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ONBOARDING TAB ════════════════════════════════════ */}
          {activeTab === 'onboarding' && (
            <div className="p-7 space-y-8 fade-in-up overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Codebase Onboarding Path</h2>
                <p className="text-xs text-gray-500 mt-1">Recommended files and learning steps to ramp up fast.</p>
              </div>

              <div className="space-y-3">
                <SectionHeading icon={BookOpen} label="1. Reading List Sequence" />
                {reports?.onboarding?.readingList?.length > 0 ? (
                  <div className="space-y-3">
                    {reports.onboarding.readingList.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-lg bg-white/3 border border-white/5 hover:border-purple-500/15 transition-all">
                        <div className="h-7 w-7 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-white truncate">{item.path}</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              item.priority === 'High' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState msg="No reading list available. Add an AI API key in Settings to generate." />
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <SectionHeading icon={Terminal} label="2. Setup Steps" />
                  {reports?.onboarding?.setupSteps?.length > 0 ? (
                    <ul className="space-y-2">
                      {reports.onboarding.setupSteps.map((step: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState msg="No setup steps available." />}
                </div>
                <div>
                  <SectionHeading icon={HelpCircle} label="3. Navigation Tips" />
                  {reports?.onboarding?.architectureTips?.length > 0 ? (
                    <ul className="space-y-2">
                      {reports.onboarding.architectureTips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <HelpCircle className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState msg="No tips available." />}
                </div>
              </div>
            </div>
          )}

          {/* ══ PROJECT STORY TAB ═════════════════════════════════ */}
          {activeTab === 'story' && (
            <div className="p-7 space-y-8 fade-in-up overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Project Evolution Story</h2>
                <p className="text-xs text-gray-500 mt-1">Timeline reconstruction clustering historical commits into architectural themes.</p>
              </div>

              {reports?.history?.evolutionSummary ? (
                <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-5">
                  <p className="text-sm text-gray-300 leading-relaxed italic">&ldquo;{reports.history.evolutionSummary}&rdquo;</p>
                </div>
              ) : (
                <EmptyState msg="No evolution summary available. Add an AI API key in Settings to generate." />
              )}

              {reports?.history?.timeline?.length > 0 ? (
                <div className="relative border-l-2 border-purple-500/15 pl-7 ml-3 space-y-7">
                  {reports.history.timeline.map((item: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[34px] top-1.5 h-4 w-4 rounded-full border-2 border-[var(--background)] bg-purple-500 shadow-lg shadow-purple-500/30" />
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{item.theme}</h4>
                          <span className="text-[10px] text-gray-600 font-mono font-semibold">({item.timePeriod})</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{item.explanation}</p>
                        {item.affectedFiles?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.affectedFiles.map((f: string) => (
                              <span key={f} className="font-mono text-[9px] text-gray-500 bg-white/4 px-2 py-0.5 rounded border border-white/5">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState msg="No timeline events generated yet." />
              )}
            </div>
          )}

          {/* ══ TECHNICAL DEBT TAB ════════════════════════════════ */}
          {activeTab === 'debt' && (
            <div className="p-7 space-y-8 fade-in-up overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Technical Debt Assessment</h2>
                  <p className="text-xs text-gray-500 mt-1">Automated analysis of code quality, branching hotspots, and warnings.</p>
                </div>
                <div className="shrink-0 glass-panel rounded-xl px-5 py-3 text-center min-w-[100px]">
                  <span className="block text-[9px] text-gray-500 uppercase font-semibold tracking-wider">Debt Index</span>
                  <span className="text-2xl font-bold font-mono" style={{
                    color: `hsl(${Math.round((1 - (reports?.techDebt?.complexityRatio || 0.5)) * 120)}, 80%, 60%)`
                  }}>
                    {Math.round((reports?.techDebt?.complexityRatio || 0.5) * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <SectionHeading icon={AlertTriangle} label="Refactoring Hotspots" />
                {reports?.techDebt?.hotspots?.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {reports.techDebt.hotspots.map((h: any, idx: number) => (
                      <div key={idx} className="glass-panel rounded-lg p-5 space-y-2 border-rose-950/20 hover:border-rose-500/20">
                        <span className="block text-xs font-mono font-bold text-rose-400 truncate">{h.path}</span>
                        <span className="inline-flex rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300">{h.metric}</span>
                        <p className="text-xs text-gray-300 leading-relaxed">{h.impact}</p>
                        <div className="pt-2 border-t border-white/5 text-xs text-gray-400 italic">
                          <strong className="text-gray-300 not-italic">Refactor: </strong>{h.refactoringStep}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState msg="No hotspots detected." />}
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div>
                  <SectionHeading icon={CheckCircle} label="General Recommendations" />
                  {reports?.techDebt?.generalRecommendations?.length > 0 ? (
                    <ul className="space-y-2">
                      {reports.techDebt.generalRecommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState msg="No recommendations available." />}
                </div>
                <div>
                  <SectionHeading icon={FileCode2} label="Dead Code Opportunities" />
                  {reports?.techDebt?.deadCodeOpportunities?.length > 0 ? (
                    <ul className="space-y-2">
                      {reports.techDebt.deadCodeOpportunities.map((opp: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <HelpCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState msg="No dead code opportunities found." />}
                </div>
              </div>
            </div>
          )}

          {/* ══ SECURITY TAB ══════════════════════════════════════ */}
          {activeTab === 'security' && (
            <div className="p-7 space-y-8 fade-in-up overflow-y-auto">
              <div>
                <h2 className="text-xl font-bold text-white">Security & Performance Audit</h2>
                <p className="text-xs text-gray-500 mt-1">AI agent reports checking static vulnerability patterns and security risks.</p>
              </div>

              <div>
                <SectionHeading icon={Shield} label="Vulnerability Warnings" />
                {reports?.security?.vulnerabilities?.length > 0 ? (
                  <div className="space-y-3">
                    {reports.security.vulnerabilities.map((vuln: any, idx: number) => (
                      <div key={idx} className={`rounded-lg border p-4 space-y-2 ${SEVERITY[vuln.severity] || SEVERITY.Low}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            vuln.severity === 'High' ? 'bg-rose-500 text-white' : vuln.severity === 'Medium' ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'
                          }`}>
                            {vuln.severity}
                          </span>
                          {vuln.category && (
                            <span className="text-xs font-bold text-white">{vuln.category}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{vuln.description}</p>
                        {vuln.mitigation && (
                          <div className="text-xs text-gray-400 pt-2 border-t border-white/5">
                            <strong className="text-gray-300">Mitigation: </strong>{vuln.mitigation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState msg="No vulnerabilities detected in static analysis." />
                )}
              </div>

              {reports?.security?.bestPracticesAdherence?.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <SectionHeading icon={CheckCircle} label="Security Best Practices" />
                  <ul className="space-y-2.5">
                    {reports.security.bestPracticesAdherence.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ══ CHAT TAB ══════════════════════════════════════════ */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full fade-in-up">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-400" /> Ask the Codebase
                </h2>
                <p className="text-xs text-gray-500 mt-1">Talk directly to your repository.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-purple-600/20 border border-purple-500/30 text-white' : 'bg-white/5 border border-white/10 text-gray-300'}`}>
                      <div className="flex items-center gap-2 mb-1 opacity-70">
                        {msg.role === 'user' ? <Terminal className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{msg.role}</span>
                      </div>
                      <div className="whitespace-pre-wrap font-sans leading-relaxed"><FormattedMessage text={msg.content} /></div>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-gray-300 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/5 bg-black/20 mt-auto">
                <form 
                  className="relative flex items-center"
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask how the authentication flow works..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                    disabled={isChatting}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatting}
                    className="absolute right-2 p-1.5 rounded-md bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
