'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Save, Key, GitBranch, Sparkles, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [githubPat, setGithubPat] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setGithubPat(data.githubPat || '');
          setGroqApiKey(data.groqApiKey || '');
          setOpenaiApiKey(data.openaiApiKey || '');
          setAnthropicApiKey(data.anthropicApiKey || '');
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubPat,
          groqApiKey,
          openaiApiKey,
          anthropicApiKey,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings to backend');
      }

      setSaveStatus('success');
      // Reload settings to refresh masked representations
      const freshRes = await fetch(`${API_BASE}/api/settings`);
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        setGithubPat(freshData.githubPat || '');
        setGroqApiKey(freshData.groqApiKey || '');
        setOpenaiApiKey(freshData.openaiApiKey || '');
        setAnthropicApiKey(freshData.anthropicApiKey || '');
      }

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm('Are you absolutely sure you want to delete all analyzed repositories from MongoDB? This cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    setDeleteMessage('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/repos`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteMessage('Database cleared successfully!');
        setTimeout(() => setDeleteMessage(''), 3000);
      } else {
        throw new Error('Failed to clear database');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to clear database');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <Navigation />
      
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="fade-in-up">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-white">System Settings</h1>
            <p className="mt-2 text-sm text-gray-400">
              Configure your API keys and credentials. Secrets are stored securely in your local MongoDB instance.
            </p>
          </div>

          {isLoading ? (
            <div className="glass-panel rounded-xl p-10 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
              <p className="mt-4 text-sm text-gray-400">Reading configurations from MongoDB...</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {/* Settings Form */}
              <form onSubmit={handleSave} className="glass-panel rounded-xl p-8 space-y-6">
                
                {/* GitHub Config */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <GitBranch className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-semibold text-white">GitHub Integration</h2>
                  </div>
                  <div>
                    <label htmlFor="github-pat" className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
                      Personal Access Token (PAT)
                    </label>
                    <input
                      id="github-pat"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={githubPat}
                      onChange={(e) => setGithubPat(e.target.value)}
                      className="premium-input w-full font-mono text-sm"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Required to bypass rate limits when cloning public repositories and fetching PR/Issue histories.
                    </p>
                  </div>
                </div>

                {/* LLM Config */}
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-gray-400" />
                      <h2 className="text-lg font-semibold text-white">AI Engine Credentials</h2>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                      Groq Primary
                    </span>
                  </div>
                  
                  {/* Primary Engine: Groq */}
                  <div className="glass-panel border-purple-950/20 p-6 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="groq-key" className="block text-xs font-semibold uppercase tracking-wider text-purple-400">
                        Groq API Key (Primary)
                      </label>
                      <span className="text-[9px] font-mono text-gray-500">Model: llama-3.3-70b-versatile</span>
                    </div>
                    <input
                      id="groq-key"
                      type="password"
                      placeholder="gsk_xxxxxxxxxxxx"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      className="premium-input w-full font-mono text-sm border-purple-950/30 focus:border-purple-500/50"
                    />
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Groq acts as the **primary** high-speed engine for full AST parsing, complexity scoring, and running structural AI Agents with minimal latency.
                    </p>
                  </div>

                  {/* Fallback Engines */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Optional Fallbacks</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="openai-key" className="block text-[11px] font-medium text-gray-400 mb-1.5">
                          OpenAI API Key (Optional)
                        </label>
                        <input
                          id="openai-key"
                          type="password"
                          placeholder="sk-proj-xxxxxxxxxxxx"
                          value={openaiApiKey}
                          onChange={(e) => setOpenaiApiKey(e.target.value)}
                          className="premium-input w-full font-mono text-xs"
                        />
                        <p className="mt-1 text-[11px] text-gray-500 leading-normal">
                          User optional. If configured, you can run the codebase with standard OpenAI models (GPT-4o-mini). Useful for quick local clones.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="anthropic-key" className="block text-[11px] font-medium text-gray-400 mb-1.5">
                          Anthropic API Key (Optional)
                        </label>
                        <input
                          id="anthropic-key"
                          type="password"
                          placeholder="sk-ant-xxxxxxxxxxxx"
                          value={anthropicApiKey}
                          onChange={(e) => setAnthropicApiKey(e.target.value)}
                          className="premium-input w-full font-mono text-xs"
                        />
                        <p className="mt-1 text-[11px] text-gray-500 leading-normal">
                          Powers optional high-fidelity reasoning using Claude 3.5 Sonnet if Groq is unavailable.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications & Submit */}
                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <span>Keys are masked when loaded. Blank fields remain unchanged.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {saveStatus === 'success' && (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1.5 text-sm text-rose-400">
                        <AlertTriangle className="h-4 w-4" />
                        Error
                      </span>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="pressable-btn flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/10 hover:brightness-110 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {errorMessage && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg mt-4">
                    {errorMessage}
                  </p>
                )}
              </form>

              {/* Advanced Admin Actions */}
              <div className="glass-panel border-rose-950/20 rounded-xl p-8 space-y-4">
                <div className="flex items-center gap-2 border-b border-rose-950/25 pb-2">
                  <Trash2 className="h-5 w-5 text-rose-400" />
                  <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Clear Analyzed Repositories</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Deletes all projects, files, commits, dependencies, and agent assessments from the local MongoDB instance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetData}
                    disabled={isDeleting}
                    className="pressable-btn flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      'Clear Database'
                    )}
                  </button>
                </div>
                {deleteMessage && (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg mt-2">
                    {deleteMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
