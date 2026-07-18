'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const darkPanelRef = useRef<HTMLDivElement>(null);
  const coloredPanelRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Lock scrolling while loading
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const tl = gsap.timeline({
      onComplete: () => {
        // Unlock scroll after complete
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        onCompleteRef.current();
      },
    });

    // 1. Counter transition
    const counterObj = { value: 0 };
    tl.to(counterObj, {
      value: 100,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        setCount(Math.floor(counterObj.value));
      },
    });

    // 2. Animate elements inside preloader out of sight
    tl.to('.preloader-content', {
      opacity: 0,
      y: -20,
      duration: 0.4,
      ease: 'power2.in',
    }, '-=0.2');

    // 3. Slide panel transitions
    // First, slide the colored accent panel (purple) up
    tl.to(coloredPanelRef.current, {
      yPercent: -100,
      duration: 0.7,
      ease: 'cubic-bezier(0.32, 0.72, 0, 1)', // iOS-like drawer easing
    }, '-=0.1');

    // Then, slide the main dark panel up, revealing the landing page
    tl.to(darkPanelRef.current, {
      yPercent: -100,
      duration: 0.7,
      ease: 'cubic-bezier(0.32, 0.72, 0, 1)',
    }, '-=0.55');

    // Hide the whole preloader container finally
    tl.to(containerRef.current, {
      display: 'none',
      duration: 0,
    });

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[999] overflow-hidden select-none pointer-events-none"
    >
      {/* Accent color panel (slides up first) */}
      <div
        ref={coloredPanelRef}
        className="absolute inset-0 z-20 bg-gradient-to-tr from-purple-600/30 to-blue-600/30"
        style={{ transform: 'translateY(0%)' }}
      />

      {/* Main dark panel */}
      <div
        ref={darkPanelRef}
        className="absolute inset-0 z-10 bg-[#06070a] flex items-center justify-center pointer-events-auto"
        style={{ transform: 'translateY(0%)' }}
      >
        {/* Content Wrapper */}
        <div className="preloader-content relative w-full h-full flex flex-col justify-between p-10 md:p-16">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold tracking-widest text-sm text-white/40 uppercase">
              Archon // Decisional Engine
            </span>
          </div>

          {/* Large Editorial Counter in the center */}
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="relative overflow-hidden">
              <h1
                className="font-serif font-light text-[22vw] leading-none text-cream select-none tracking-tighter"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {String(count).padStart(3, '0')}
              </h1>
            </div>
            <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-cream-muted mt-2 animate-pulse">
              Reconstructing Workspace Modules
            </div>
          </div>

          {/* Bottom metadata */}
          <div className="flex justify-between items-end border-t border-white/5 pt-6 text-xs text-cream-muted font-mono">
            <span>INITIATING CORE DECISION GRAPH</span>
            <span>BUILD v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
