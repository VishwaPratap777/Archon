'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, Sun, Moon, Zap, User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';
import FlipLink from '@/components/ui/FlipLink';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import AuthModal from '@/components/AuthModal';
import { TokenUsageModal } from '@/components/TokenUsageWidget';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { user, logout, openAuthModal } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analyze', label: 'Analyze Repo' },
    { href: '/settings', label: 'Settings' },
  ];

  const formatTokens = (num: number = 0) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  const totalTokens = user?.tokenUsage?.totalTokens || 0;

  return (
    <>
      <AuthModal />
      <TokenUsageModal isOpen={isTokenModalOpen} onClose={() => setIsTokenModalOpen(false)} />

      {/* Floating Center Capsule Navbar */}
      <div className="fixed top-5 left-0 w-full z-50 px-4 pointer-events-none select-none flex justify-center">
        <nav
          className={`pointer-events-auto flex items-center justify-between rounded-full border border-white/10 bg-[#273338] shadow-2xl transition-all duration-300 px-6 h-14 ${
            scrolled ? 'w-full max-w-5xl backdrop-blur-md bg-[#273338]/95' : 'w-full max-w-6xl'
          }`}
        >
          {/* Logo (Left) */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="relative flex h-7 w-7 items-center justify-center transition-transform duration-300 group-hover:scale-105 active:scale-95">
              <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9CB080" />
                    <stop offset="100%" stopColor="#618764" />
                  </linearGradient>
                </defs>
                <path d="M 50 12 L 83 78 L 68 78 L 50 42 L 32 78 L 17 78 Z" fill="url(#logo-grad)" />
                <path d="M 50 60 L 58 78 L 42 78 Z" fill="url(#logo-grad)" />
              </svg>
            </div>
            <span className="font-sans font-bold tracking-[0.25em] text-sm text-white select-none">
              ΛRCHON
            </span>
          </Link>

          {/* Desktop Links (Center) */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <FlipLink
                key={link.href}
                href={link.href}
                className="text-[10px] font-mono tracking-widest uppercase text-white/70 hover:text-white font-medium"
              >
                {link.label}
              </FlipLink>
            ))}
          </div>

          {/* Desktop Right: Auth + Token counter + Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <motion.span
                key={theme}
                initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {theme === 'dark'
                  ? <Sun className="h-3.5 w-3.5" />
                  : <Moon className="h-3.5 w-3.5" />}
              </motion.span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Token usage counter badge */}
                <button
                  onClick={() => setIsTokenModalOpen(true)}
                  className="pressable-btn flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[11px] font-mono text-purple-300 hover:bg-purple-500/20 transition-all"
                  title="Click to view full LLM Token usage analytics"
                >
                  <Zap className="h-3.5 w-3.5 text-purple-400 fill-purple-400/20" />
                  <span>{formatTokens(totalTokens)} Tokens</span>
                </button>

                {/* User avatar & logout */}
                <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-mono text-white">
                  <UserIcon className="h-3 w-3 text-emerald-400" />
                  <span className="max-w-[90px] truncate">{user.username}</span>
                  <button
                    onClick={logout}
                    className="ml-1 text-gray-400 hover:text-rose-400 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="pressable-btn text-[10px] font-mono tracking-widest uppercase text-[#273338] bg-[#faf8f4] hover:bg-white rounded-full px-4.5 py-1.8 flex items-center gap-1.5 font-semibold shadow"
              >
                Sign In <ArrowRight className="h-3 w-3 text-[#273338]" />
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle (Right) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden pressable-btn flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-24 left-4 right-4 z-40 rounded-3xl border border-white/10 bg-[#273338] p-6 shadow-2xl md:hidden flex flex-col justify-between gap-6 select-none"
          >
            <div className="flex flex-col gap-4">
              {user && (
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs text-white">
                    <UserIcon className="h-4 w-4 text-emerald-400" />
                    <span>{user.username}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsTokenModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono"
                  >
                    <Zap className="h-3 w-3 text-purple-400" />
                    {formatTokens(totalTokens)} Tokens
                  </button>
                </div>
              )}

              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="font-sans font-semibold text-lg tracking-tight text-white/70 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-2.5 text-xs font-mono tracking-widest uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-2.5 text-xs font-mono tracking-widest uppercase text-rose-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    openAuthModal('login');
                  }}
                  className="pressable-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9CB080] to-[#618764] py-3 text-xs font-mono tracking-widest uppercase text-white font-semibold"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
