'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { 
  GitFork, 
  FolderGit2, 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  ArrowUpRight, 
  Terminal, 
  Settings as SettingsIcon,
  Loader2
} from 'lucide-react';

interface Repository {
  _id: string;
  githubUrl: string;
  name: string;
  owner: string;
  status: string;
  progress: number;
  frameworks?: string[];
  stats?: {
    loc: number;
    fileCount: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRepos() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/repos`);
        if (res.ok) {
          const data = await res.json();
          setRepos(data);
        }
      } catch (err) {
        console.error('Failed to load repositories', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRepos();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="h-3 w-3" /> Fully Parsed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navigation />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <div className="fade-in-up">
          {/* Dashboard Header */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Repository Catalog</h1>
              <p className="mt-2 text-sm text-gray-400">
                Access analyzed systems, system architecture designs, and AI agent evaluations.
              </p>
            </div>
            
            <Link
              href="/analyze"
              className="pressable-btn inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/10 hover:brightness-110"
            >
              <Plus className="h-4.5 w-4.5" />
              Analyze Repository
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : repos.length === 0 ? (
            /* Empty State */
            <div className="glass-panel rounded-2xl p-12 text-center max-w-xl mx-auto flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-6">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">No Analyzed Repositories</h3>
              <p className="mt-2 text-xs text-gray-400 max-w-sm leading-relaxed">
                Connect your first repository by pasting its URL. Archon will construct dependency flows, metrics, and timeline events.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/analyze"
                  className="pressable-btn rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-4 py-2 text-xs font-semibold text-white"
                >
                  Analyze Repo Now
                </Link>
                <Link
                  href="/settings"
                  className="pressable-btn rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
                >
                  Configure Credentials
                </Link>
              </div>
            </div>
          ) : (
            /* Repository List Grid */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {repos.map((repo, idx) => (
                <div
                  key={repo._id}
                  className="glass-panel group relative rounded-xl p-6 hover:border-purple-500/20 transition-all duration-300 flex flex-col justify-between"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Top Header Card */}
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      {getStatusBadge(repo.status)}
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(repo.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight leading-snug group-hover:text-purple-300 transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mb-4">{repo.owner}</p>

                    {/* Stats summary */}
                    {repo.stats && (
                      <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-3 mb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Lines of Code</p>
                          <p className="text-sm font-semibold text-gray-300 font-mono">
                            {repo.stats.loc.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Files</p>
                          <p className="text-sm font-semibold text-gray-300 font-mono">
                            {repo.stats.fileCount}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Language Pills */}
                    {repo.frameworks && repo.frameworks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {repo.frameworks.map((f) => (
                          <span 
                            key={f} 
                            className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400 border border-white/5"
                          >
                            <Terminal className="h-2.5 w-2.5 text-purple-400" /> {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom CTA */}
                  <Link
                    href={repo.status === 'completed' ? `/repo/${repo._id}` : `/analyze?id=${repo._id}`}
                    className="pressable-btn mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/20 hover:text-white px-4 py-2 text-xs font-semibold text-gray-300 group-hover:bg-purple-500/5"
                  >
                    {repo.status === 'completed' ? (
                      <>
                        Explore Intelligence
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        View Analysis Progress
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
