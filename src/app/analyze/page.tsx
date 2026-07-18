'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { 
  GitBranch, 
  Terminal, 
  Loader2, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

// Wrap search params logic in a boundary to prevent Next.js SSR de-optimization
function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoIdFromQuery = searchParams.get('id');

  const [githubUrl, setGithubUrl] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(repoIdFromQuery);
  const [jobStatus, setJobStatus] = useState<string>('idle'); // idle, cloning, parsing, agents, completed, failed
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Automatically trigger analysis if 'url' query param is passed
  useEffect(() => {
    const urlFromQuery = searchParams.get('url');
    if (urlFromQuery && !activeJobId && !isSubmitting) {
      setGithubUrl(urlFromQuery);
      
      const autoSubmit = async () => {
        setIsSubmitting(true);
        setErrorMsg('');
        setLogs([]);
        setProgress(0);

        try {
          const res = await fetch('/api/repos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ githubUrl: urlFromQuery }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to submit repository');

          setActiveJobId(data.repositoryId);
          setJobStatus('pending');
          router.push(`/analyze?id=${data.repositoryId}`);
        } catch (err: any) {
          setErrorMsg(err.message || 'An error occurred.');
          setIsSubmitting(false);
        }
      };
      
      autoSubmit();
    }
  }, [searchParams]);

  // Poll job status if activeJobId is present
  useEffect(() => {
    if (!activeJobId) return;

    let timer: NodeJS.Timeout;
    
    async function pollStatus() {
      try {
        const res = await fetch(`/api/repos/${activeJobId}/status`);
        if (!res.ok) throw new Error('Status check failed');
        
        const data = await res.json();
        setJobStatus(data.status);
        setProgress(data.progress);
        setLogs(data.logs || []);

        if (data.status === 'completed' || data.status === 'failed') {
          // Stop polling
          return;
        }

        // Keep polling
        timer = setTimeout(pollStatus, 1500);
      } catch (err) {
        console.error('Error polling status', err);
        timer = setTimeout(pollStatus, 3000); // Back off but retry
      }
    }

    pollStatus();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId]);

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setLogs([]);
    setProgress(0);

    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit repository');

      setActiveJobId(data.repositoryId);
      setJobStatus('pending');
      // Push URL parameters to enable page reload persistence
      router.push(`/analyze?id=${data.repositoryId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  const getProgressColor = () => {
    if (jobStatus === 'failed') return 'bg-rose-500';
    if (jobStatus === 'completed') return 'bg-emerald-500';
    return 'bg-gradient-to-r from-purple-500 to-blue-500';
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navigation />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="fade-in-up">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-white">Repository Analysis</h1>
            <p className="mt-2 text-sm text-gray-400">
              Provide a public Git URL to extract AST definitions, structural layouts, and run specialized AI assessments.
            </p>
          </div>

          {!activeJobId ? (
            /* URL Submit Form */
            <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-8 space-y-6">
              <div className="space-y-2">
                <label htmlFor="repo-url" className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  GitHub Repository URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <GitBranch className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-gray-500" />
                    <input
                      id="repo-url"
                      type="url"
                      required
                      placeholder="https://github.com/owner/repository"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="premium-input w-full pl-11 text-sm py-3.5"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="pressable-btn flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/10 hover:brightness-110 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      <>
                        Analyze Repo
                        <ChevronRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {errorMsg && (
                <div className="flex gap-2 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          ) : (
            /* Live Progress Tracker */
            <div className="space-y-6">
              <div className="glass-panel rounded-xl p-8 space-y-6">
                
                {/* Progress bar info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {jobStatus === 'completed' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                    {jobStatus === 'failed' && <XCircle className="h-6 w-6 text-rose-500" />}
                    {jobStatus !== 'completed' && jobStatus !== 'failed' && (
                      <Loader2 className="h-6 w-6 text-[var(--primary)] animate-spin" />
                    )}
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        {jobStatus === 'completed' && 'Analysis Completed'}
                        {jobStatus === 'failed' && 'Analysis Failed'}
                        {jobStatus === 'cloning' && 'Downloading Codebase'}
                        {jobStatus === 'parsing' && 'Running Deterministic Parser'}
                        {jobStatus === 'agents' && 'Invoking AI Domain Agents'}
                        {jobStatus === 'pending' && 'Job Initializing'}
                      </h2>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">Job ID: {activeJobId}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-300 font-mono">{progress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Completion CTA */}
                {jobStatus === 'completed' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div>
                      <p className="text-sm font-semibold text-white">Reconstruction Complete</p>
                      <p className="text-xs text-gray-400 mt-0.5">AST files, dependency flows, and domain assessments are now in MongoDB.</p>
                    </div>
                    <button
                      onClick={() => router.push(`/repo/${activeJobId}`)}
                      className="pressable-btn flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white"
                    >
                      Open Dashboard
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Failure Retry */}
                {jobStatus === 'failed' && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Analysis Terminated</p>
                      <p className="text-xs text-gray-400 mt-0.5">Review the terminal logs below to diagnose database or clone errors.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveJobId(null);
                        router.push('/analyze');
                      }}
                      className="pressable-btn flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try Another URL
                    </button>
                  </div>
                )}
              </div>

              {/* Console Logs Output */}
              <div className="glass-panel rounded-xl overflow-hidden">
                <div className="bg-black/30 px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Terminal className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Background Compiler Terminal</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">Lines: {logs.length}</span>
                </div>
                
                <div className="p-5 bg-black/40 font-mono text-xs text-gray-400 space-y-2 max-h-[350px] overflow-y-auto min-h-[150px]">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <span className="text-purple-600/60 select-none">❯</span>
                      <span className="flex-1 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  {jobStatus !== 'completed' && jobStatus !== 'failed' && (
                    <div className="flex gap-2.5 items-center text-purple-400 animate-pulse">
                      <span className="text-purple-600/60 select-none">❯</span>
                      <span className="flex items-center gap-1">
                        Executing tasks<span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span><span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                      </span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-[var(--background)]">
        <Navigation />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
