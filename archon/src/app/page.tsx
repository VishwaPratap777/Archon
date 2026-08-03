'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

import RepositoryNetwork from '@/components/ui/RepositoryNetwork';
import CustomCursor from '@/components/ui/CustomCursor';
import Navigation from '@/components/Navigation';
import Hero from '@/components/sections/Hero';
import FeatureGrid from '@/components/sections/FeatureGrid';
import ConsoleDemo from '@/components/sections/ConsoleDemo';
import HoldToUnlock from '@/components/sections/HoldToUnlock';
import Footer from '@/components/Footer';

export default function Home() {
  // Initialize Lenis smooth scroll immediately on mount
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.9,
    });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      {/* Premium Noise Grain Overlay */}
      <div className="noise-overlay" aria-hidden="true" />
      
      {/* Neural pulsing repository network background */}
      <RepositoryNetwork />
      
      {/* Custom Cursor System */}
      <CustomCursor />

      {/* Main Page Layout */}
      <div className="relative flex flex-col min-h-screen opacity-100 z-10">
        <Navigation />
        
        <main className="flex-grow">
          <Hero />
          <FeatureGrid />
          <ConsoleDemo />
          <HoldToUnlock />
        </main>

        <Footer />
      </div>
    </>
  );
}
