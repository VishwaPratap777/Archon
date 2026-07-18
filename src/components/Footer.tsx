'use client';

import Link from 'next/link';
import FlipLink from '@/components/ui/FlipLink';
import { motion } from 'framer-motion';

export default function Footer() {
  const linksCompany = [
    { label: 'Documentation', href: '#' },
    { label: 'AST Engine', href: '#' },
    { label: 'Decisions API', href: '#' },
  ];

  const linksLegal = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ];

  return (
    <footer className="w-full bg-bg-surface border-t border-black/5 pt-20 pb-12 relative z-10 overflow-hidden">
      {/* Decorative Blur Ambient Lights */}
      <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-[#9cb080]/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 pb-16">
          {/* Logo and Tagline */}
          <div className="md:col-span-2 space-y-4">
            <span className="font-sans font-bold tracking-widest text-lg text-cream">
              ARCHON
            </span>
            <p className="text-sm text-cream-dim max-w-sm font-sans leading-relaxed">
              Constructing context-aware code decisions, dependencies, and onboarding maps autonomously. Built for engineering teams who value craftsmanship.
            </p>
          </div>

          {/* Links: Platform */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono tracking-[0.2em] uppercase text-cream-muted font-semibold">
              Platform
            </h4>
            <ul className="space-y-2">
              {linksCompany.map((l) => (
                <li key={l.label}>
                  <FlipLink
                    href={l.href}
                    className="text-xs font-mono tracking-widest uppercase text-cream-dim hover:text-cream font-medium"
                  >
                    {l.label}
                  </FlipLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Links: Legal */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono tracking-[0.2em] uppercase text-cream-muted font-semibold">
              Legal
            </h4>
            <ul className="space-y-2">
              {linksLegal.map((l) => (
                <li key={l.label}>
                  <FlipLink
                    href={l.href}
                    className="text-xs font-mono tracking-widest uppercase text-cream-dim hover:text-cream font-medium"
                  >
                    {l.label}
                  </FlipLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center Sanskrit Shloka Block */}
        <div className="border-t border-black/5 py-12 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 15 }}
            whileInView={{ opacity: 0.6, filter: 'blur(0px)', y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="text-center font-serif text-[clamp(1.5rem,3.5vw,2.5rem)] font-light italic text-cream tracking-wider"
          >
            || निर्णयः परमं बलम् ||
          </motion.div>
          <div className="text-[9px] font-mono tracking-[0.3em] uppercase text-cream-muted mt-2">
            Decision is the ultimate strength
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-black/5 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono tracking-widest uppercase text-cream-muted gap-4">
          <span>© {new Date().getFullYear()} ARCHON PLATFORM // ALL RIGHTS RESERVED</span>
          <div className="flex gap-4">
            <span>LOCAL INSTANCE v1.0.0-BETA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
