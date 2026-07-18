'use client';

import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Terminal, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parallax glow effect using springs
  const mouseX = useSpring(0, { stiffness: 60, damping: 15 });
  const mouseY = useSpring(0, { stiffness: 60, damping: 15 });

  const glowX = useTransform(mouseX, [-0.5, 0.5], ['-10%', '10%']);
  const glowY = useTransform(mouseY, [-0.5, 0.5], ['-10%', '10%']);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = (clientX / window.innerWidth) - 0.5;
      const y = (clientY / window.innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Initial load animations using GSAP (Delays reduced since preloader is removed)
    const ctx = gsap.context(() => {
      // Reveal tagline
      gsap.fromTo(
        '.hero-tagline',
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'cubic-bezier(0.23, 1, 0.32, 1)', delay: 0.1 }
      );

      // Reveal title letters
      gsap.fromTo(
        '.hero-title-word',
        { opacity: 0, y: 30, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.08,
          ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
          delay: 0.2,
        }
      );

      // Reveal descriptive paragraph
      gsap.fromTo(
        '.hero-desc',
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 0.75, y: 0, scale: 1, duration: 0.8, ease: 'cubic-bezier(0.23, 1, 0.32, 1)', delay: 0.5 }
      );

      // Reveal buttons
      gsap.fromTo(
        '.hero-cta',
        { opacity: 0, y: 15, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'cubic-bezier(0.23, 1, 0.32, 1)', delay: 0.6 }
      );
    }, containerRef);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, [mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[92vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden px-6"
    >
      {/* Soft Sage & Forest Green ambient lights with spring-based mouse interpolation */}
      <motion.div
        style={{ x: glowX, y: glowY }}
        className="absolute top-[-10%] left-[-15%] w-[650px] h-[650px] rounded-full bg-[#9cb080]/6 blur-[140px] pointer-events-none"
      />
      <motion.div
        style={{ x: glowY, y: glowX }}
        className="absolute bottom-[-10%] right-[-15%] w-[650px] h-[650px] rounded-full bg-[#618764]/6 blur-[140px] pointer-events-none"
      />

      {/* Hero content */}
      <div className="text-center max-w-4xl mx-auto space-y-8 relative z-10 flex flex-col items-center select-none">
        {/* Tagline */}
        <div className="hero-tagline opacity-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#618764]/10 bg-[#618764]/5 text-[10px] font-mono tracking-[0.25em] text-[#2b5748] uppercase">
          <Terminal className="h-3.5 w-3.5 text-[#2b5748]" /> Autonomous Decision Engine
        </div>

        {/* Editorial Heading */}
        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-cream leading-[1.02] uppercase font-sans">
          <span className="hero-title-word block">Go Beyond</span>
          <span className="hero-title-word block text-transparent bg-clip-text bg-gradient-to-r from-[#2b5748] via-[#618764] to-[#9cb080]">
            Explaining Code
          </span>
          <span className="hero-title-word block">Reconstruct IT.</span>
        </h1>

        {/* Descriptive copy */}
        <p className="hero-desc opacity-0 text-sm md:text-lg text-cream-dim max-w-2xl mx-auto leading-relaxed font-sans font-light">
          Archon parses code syntax tree structural nodes dynamically and traces complete commit lineage to generate architectural dependency graphs, design decisions, and bespoke dev curriculums.
        </p>

        {/* Buttons */}
        <div className="hero-cta opacity-0 pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <a
            href="#demo"
            className="pressable-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2b5748] to-[#618764] hover:from-[#1d3c31] hover:to-[#4e6c50] px-7 py-4 text-xs font-mono tracking-widest uppercase text-white shadow-lg shadow-[#2b5748]/15"
          >
            Launch Console
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </a>

          <a
            href="#hold-to-unlock"
            className="pressable-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-black/5 hover:border-black/10 bg-black/2.5 px-7 py-4 text-xs font-mono tracking-widest uppercase text-cream hover:text-white"
          >
            Access Credentials
          </a>
        </div>
      </div>
    </section>
  );
}
