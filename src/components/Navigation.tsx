'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Menu, X, ArrowRight } from 'lucide-react';
import FlipLink from '@/components/ui/FlipLink';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#demo', label: 'Console Demo' },
    { href: '#hold-to-unlock', label: 'Get Started' },
  ];

  return (
    <>
      {/* Floating Center Capsule Navbar */}
      <div className="fixed top-5 left-0 w-full z-50 px-4 pointer-events-none select-none flex justify-center">
        <nav
          className={`pointer-events-auto flex items-center justify-between rounded-full border border-white/10 bg-[#273338] shadow-2xl transition-all duration-300 px-6 h-14 ${
            scrolled ? 'w-full max-w-4xl backdrop-blur-md bg-[#273338]/95' : 'w-full max-w-5xl'
          }`}
        >
          {/* Logo (Left) */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#9CB080] to-[#618764] text-white transition-transform duration-300 group-hover:scale-105 active:scale-95">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <span className="font-sans font-bold tracking-wider text-sm text-white">
              ARCHON
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

          {/* Desktop Button (Right) */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#hold-to-unlock"
              className="pressable-btn text-[10px] font-mono tracking-widest uppercase text-[#273338] bg-[#faf8f4] hover:bg-white rounded-full px-4.5 py-1.8 flex items-center gap-1.5 font-semibold"
            >
              Access <ArrowRight className="h-3 w-3 text-[#273338]" />
            </a>
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

      {/* Mobile Drawer Menu (Slide Down below navbar) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-24 left-4 right-4 z-40 rounded-3xl border border-white/10 bg-[#273338] p-6 shadow-2xl md:hidden flex flex-col justify-between gap-8 select-none"
          >
            <div className="flex flex-col gap-5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="font-sans font-semibold text-xl tracking-tight text-white/70 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <a
                href="#hold-to-unlock"
                onClick={() => setIsOpen(false)}
                className="pressable-btn w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#9CB080] to-[#618764] py-3 text-xs font-mono tracking-widest uppercase text-white font-semibold"
              >
                Access Dashboard
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
