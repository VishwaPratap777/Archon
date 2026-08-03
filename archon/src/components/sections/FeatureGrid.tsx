'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { FileCode2, GitMerge, LineChart, Compass, Zap, ShieldAlert } from 'lucide-react';

const features = [
  {
    icon: FileCode2,
    title: 'AST Tree-Sitter Parser',
    description: 'Generates detailed abstract syntax trees (AST) to map syntax structures, classes, functions, and imports instantly.',
    accent: 'from-[#2b5748]/30 to-[#618764]/30',
  },
  {
    icon: GitMerge,
    title: 'Interactive Decision Graph',
    description: 'Calculates structural dependencies and resolves circular references in code using real-time node rendering.',
    accent: 'from-[#618764]/30 to-[#9cb080]/30',
  },
  {
    icon: LineChart,
    title: 'Technical Debt Metrics',
    description: 'Evaluates cyclomatic complexity, dead code locations, and maintainability Indexes directly within the dashboard.',
    accent: 'from-[#2b5748]/30 to-[#9cb080]/30',
  },
  {
    icon: Compass,
    title: 'Bespoke Dev Curriculum',
    description: 'AI-generated personalized onboarding modules outlining key functional paths and entry-point scripts.',
    accent: 'from-[#9cb080]/30 to-[#618764]/30',
  },
  {
    icon: Zap,
    title: 'Decision History Timeline',
    description: 'Clusters code changes into conceptual architectural pivots, explaining why files evolved over time.',
    accent: 'from-[#618764]/30 to-[#2b5748]/30',
  },
  {
    icon: ShieldAlert,
    title: 'Static Security Audits',
    description: 'Inspects module imports and patterns automatically to detect performance locks, syntax violations, and leaks.',
    accent: 'from-[#2b5748]/30 to-[#618764]/30',
  },
];

// 3D Tilt Card Component using Framer Motion Springs
function FeatureCard({ feat, index }: { feat: typeof features[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for cursor position relative to card dimensions
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation angles to create momentum physics
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 150, damping: 18 });

  // Shine overlay gradient position based on cursor coords
  const shineX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const shineY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Normalize cursor coordinates from -0.5 to 0.5
    const relativeX = (e.clientX - rect.left) / width - 0.5;
    const relativeY = (e.clientY - rect.top) / height - 0.5;

    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    // Reset values smoothly back to zero resting state
    x.set(0);
    y.set(0);
  };

  const Icon = feat.icon;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.06, // Stagger animation delay (60ms stagger)
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="glass-panel group relative rounded-2xl p-7 flex flex-col gap-6 cursor-pointer border border-black/5 bg-[rgba(255,255,255,0.4)] pressable-btn h-full select-none"
    >
      {/* Glossy radial light source overlay */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(800px circle at ${shineX} ${shineY}, rgba(43, 87, 72, 0.05), transparent 40%)`,
        }}
      />

      {/* Decorative gradient top border highlight */}
      <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${feat.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-t-2xl`} />

      {/* Feature Icon Container with starting-style zoom */}
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#618764]/5 text-cream-dim group-hover:text-[#2b5748] group-hover:bg-[#618764]/15 transition-all duration-300 border border-[#618764]/10">
        <Icon className="h-5.5 w-5.5 transition-transform duration-300 group-hover:scale-105" />
      </div>

      {/* Card Info */}
      <div className="space-y-2" style={{ transform: 'translateZ(10px)' }}>
        <h3 className="text-sm font-mono tracking-widest uppercase text-cream group-hover:text-[#2b5748] transition-colors duration-200">
          {feat.title}
        </h3>
        <p className="text-xs text-cream-dim leading-relaxed font-sans font-light">
          {feat.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function FeatureGrid() {
  return (
    <section id="features" className="py-32 border-t border-black/5 relative z-10 px-6 max-w-7xl mx-auto">
      {/* Decorative background lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#9cb080]/5 blur-[120px] pointer-events-none" />

      {/* Section Header */}
      <div className="text-center space-y-4 mb-20">
        <h2 className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#618764] font-semibold">
          Architectural Core
        </h2>
        <p className="font-sans font-semibold text-cream text-3xl md:text-5xl max-w-2xl mx-auto leading-tight">
          Every decision analyzed, parsed, and reconstructed in context.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feat, idx) => (
          <FeatureCard key={feat.title} feat={feat} index={idx} />
        ))}
      </div>
    </section>
  );
}
