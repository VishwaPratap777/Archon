'use client';

import { useEffect, useRef } from 'react';

const REPO_NAMES = [
  'VishwaPratap777/Archon', 'facebook/react', 'vercel/next.js', 'tailwindlabs/tailwindcss',
  'nodejs/node', 'microsoft/typescript', 'python/cpython', 'golang/go',
  'rust-lang/rust', 'docker/cli', 'kubernetes/kubernetes', 'tensorflow/tensorflow',
  'pytorch/pytorch', 'django/django', 'pallets/flask', 'spring-projects/spring-boot',
  'denoland/deno', 'oven-sh/bun', 'vuejs/core', 'angular/angular',
  'sveltejs/svelte', 'vitejs/vite', 'webpack/webpack', 'rollup/rollup',
  'git/git', 'neovim/neovim', 'torvalds/linux', 'elastic/elasticsearch',
  'redis/redis', 'mongodb/mongo', 'postgres/postgres', 'apache/kafka',
  'sqlite/sqlite', 'prometheus/prometheus', 'grafana/grafana', 'ansible/ansible',
  'hashicorp/terraform', 'hashicorp/vault', 'argoproj/argo-cd', 'elastic/logstash'
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  label: string | null;
  opacity: number;
}

interface StaticNode {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export default function RepositoryNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;
    
    // Grid settings
    const activeNodes: Node[] = [];
    const staticNodes: StaticNode[] = [];
    const nodeCount = 140; // Number of dynamic active neural nodes
    const staticNodeCount = 750; // Number of static micro-nodes in deep background
    const connectionDistance = 155; // Max distance for drawing synapses

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Re-populate nodes to fit screen dimensions
      activeNodes.length = 0;
      staticNodes.length = 0;

      // 1. Generate pulsing dynamic nodes
      for (let i = 0; i < nodeCount; i++) {
        // Assign labels to 30% of nodes
        const hasLabel = Math.random() < 0.28;
        const label = hasLabel ? REPO_NAMES[Math.floor(Math.random() * REPO_NAMES.length)] : null;
        
        activeNodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28, // Slow organic neural drift
          vy: (Math.random() - 0.5) * 0.28,
          baseRadius: Math.random() * 2 + 1.2,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          label,
          opacity: Math.random() * 0.4 + 0.3
        });
      }

      // 2. Generate static background micro-nodes (stars / distant repositories)
      for (let i = 0; i < staticNodeCount; i++) {
        staticNodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 0.6 + 0.3,
          opacity: Math.random() * 0.35 + 0.1
        });
      }
    };

    // Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      mouseRef.current.active = false;
    };

    // Initialize layout
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Main Draw loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw static background nodes (simulate thousands of tiny points)
      ctx.fillStyle = '#618764'; // Accent theme color for nodes
      for (const sn of staticNodes) {
        ctx.beginPath();
        ctx.globalAlpha = sn.opacity;
        ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw connections (synapses) between close active nodes
      ctx.strokeStyle = '#9CB080'; // Sage green accent for lines
      ctx.lineWidth = 0.65;
      
      for (let i = 0; i < activeNodes.length; i++) {
        const n1 = activeNodes[i];
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n2 = activeNodes[j];
          
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            // Pulse the synapse line opacity slowly
            const pulse = Math.sin((n1.pulsePhase + n2.pulsePhase) * 0.5) * 0.05 + 0.95;
            const alpha = (1 - dist / connectionDistance) * 0.28 * pulse;
            
            ctx.beginPath();
            ctx.globalAlpha = alpha;
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // 2.5. Draw synapses connecting directly to the mouse pointer
      const mouse = mouseRef.current;
      if (mouse.active) {
        ctx.strokeStyle = '#618764'; // Forest green synapses to mouse
        ctx.lineWidth = 0.8;
        for (const n of activeNodes) {
          const mdx = mouse.x - n.x;
          const mdy = mouse.y - n.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < 155) {
            const alpha = (1 - mdist / 155) * 0.35;
            ctx.beginPath();
            ctx.globalAlpha = alpha;
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        }
      }

      // 3. Update & Draw active nodes
      ctx.font = '7px JetBrains Mono, var(--font-geist-mono), monospace';
      ctx.textBaseline = 'middle';

      for (const n of activeNodes) {
        // Drift position
        n.x += n.vx;
        n.y += n.vy;

        // Wrap around boundaries
        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Update pulse phase
        n.pulsePhase += n.pulseSpeed;
        const pulseRatio = Math.sin(n.pulsePhase) * 0.4 + 0.8; // pulsing scale factor

        // Mouse hover interaction: pull nodes near the mouse
        let isHovered = false;
        if (mouse.active) {
          const mdx = mouse.x - n.x;
          const mdy = mouse.y - n.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < 140) {
            isHovered = true;
            // Pull factor
            const pullForce = (140 - mdist) / 140 * 0.12;
            n.x += (mdx / mdist) * pullForce;
            n.y += (mdy / mdist) * pullForce;
          }
        }

        // Draw pulsing outer glow circle
        ctx.beginPath();
        ctx.globalAlpha = isHovered ? 0.15 : 0.05;
        ctx.arc(n.x, n.y, n.baseRadius * 2.8 * pulseRatio, 0, Math.PI * 2);
        ctx.fillStyle = '#618764';
        ctx.fill();

        // Draw node core
        ctx.beginPath();
        ctx.globalAlpha = isHovered ? 0.95 : n.opacity;
        ctx.arc(n.x, n.y, n.baseRadius * pulseRatio, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#2B5748' : '#618764';
        ctx.fill();

        // Render Repository label text next to labeled nodes
        if (n.label) {
          ctx.beginPath();
          ctx.globalAlpha = isHovered ? 0.9 : 0.18;
          ctx.fillStyle = '#9CB080'; // sage green — visible on dark backgrounds
          ctx.fillText(n.label, n.x + n.baseRadius * 2.5 + 2, n.y);
        }
      }

      ctx.globalAlpha = 1.0;
      animationId = requestAnimationFrame(draw);
    };

    // Begin render frame loop
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none select-none z-0"
      style={{
        opacity: 0,
        animation: 'fadeInCanvas 1.6s cubic-bezier(0.23,1,0.32,1) 0.4s forwards',
      }}
    />
  );
}
