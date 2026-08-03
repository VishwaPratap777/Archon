'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User as UserIcon, Loader2, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, authModalTab, closeAuthModal, login, register } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>(authModalTab);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync tab state when modal triggers
  React.useEffect(() => {
    setTab(authModalTab);
    setError('');
  }, [authModalTab, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Username is required.');
        }
        await register(username, email, password);
      }
      // Reset form
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#273338] p-8 shadow-2xl z-10 select-none"
        >
          {/* Top Close Button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Modal Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9CB080] to-[#618764] text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {tab === 'login' ? 'Welcome Back' : 'Create Archon Account'}
              </h2>
              <p className="text-xs text-gray-400">
                {tab === 'login' ? 'Sign in to access user token tracking & intelligence' : 'Start tracking AI agent usage with JWT authentication'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 flex gap-1 rounded-xl bg-black/20 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-mono tracking-wider uppercase font-semibold transition-all ${
                tab === 'login'
                  ? 'bg-[#faf8f4] text-[#273338] shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-mono tracking-wider uppercase font-semibold transition-all ${
                tab === 'register'
                  ? 'bg-[#faf8f4] text-[#273338] shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-gray-400 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="john_doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="premium-input w-full pl-10 text-xs py-2.5"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="premium-input w-full pl-10 text-xs py-2.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-input w-full pl-10 text-xs py-2.5"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="pressable-btn w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9CB080] to-[#618764] py-3 text-xs font-mono tracking-widest uppercase font-semibold text-white shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tab === 'login' ? 'Authenticating...' : 'Creating Account...'}
                </>
              ) : (
                <>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p className="mt-6 text-center text-[11px] text-gray-500">
            JWT tokens expire after 7 days. Your token usage is saved across sessions.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
