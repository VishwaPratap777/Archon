'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Cpu, ArrowDownLeft, ArrowUpRight, Activity, Clock, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface TokenLog {
  _id: string;
  agentType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  createdAt: string;
}

export function TokenUsageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, authFetch } = useAuth();
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUsage = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await authFetch(`${API_BASE}/api/auth/usage`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load token usage logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsage();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const tokenUsage = user.tokenUsage || {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requestCount: 0,
  };

  const formatTokens = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 bg-[#273338] p-8 shadow-2xl z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Zap className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">LLM Token Usage Analytics</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Authenticated session for <span className="text-purple-300 font-mono font-medium">{user.username}</span> ({user.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Total Tokens
              </span>
              <p className="text-2xl font-bold text-white font-mono mt-1">
                {formatTokens(tokenUsage.totalTokens)}
              </p>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3 text-blue-400" /> Prompt (Input)
              </span>
              <p className="text-xl font-bold text-gray-200 font-mono mt-1">
                {formatTokens(tokenUsage.promptTokens)}
              </p>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-400" /> Completion (Output)
              </span>
              <p className="text-xl font-bold text-gray-200 font-mono mt-1">
                {formatTokens(tokenUsage.completionTokens)}
              </p>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Activity className="h-3 w-3 text-amber-400" /> AI Agent Calls
              </span>
              <p className="text-xl font-bold text-gray-200 font-mono mt-1">
                {tokenUsage.requestCount || logs.length}
              </p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Recent Token Audit Trail
              </h3>
              <button
                onClick={loadUsage}
                disabled={isLoading}
                className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-4 font-mono text-xs space-y-2">
              {logs.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-xs">
                  {isLoading ? 'Loading token usage logs...' : 'No LLM agent token transactions recorded yet. Run a repository analysis!'}
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 gap-2 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase font-bold">
                        {log.agentType}
                      </span>
                      <span className="text-gray-400 text-[11px] truncate max-w-[150px]">
                        {log.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-300 text-[11px]">
                      <span>Prompt: <strong className="text-blue-300">{log.promptTokens}</strong></span>
                      <span>Output: <strong className="text-emerald-300">{log.completionTokens}</strong></span>
                      <span className="font-bold text-purple-300">Total: {log.totalTokens}</span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Authenticated via Archon JWT
            </span>
            <span>Usage automatically attributed to user account</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
