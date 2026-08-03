'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Copy, Check, Key } from 'lucide-react';

export default function HoldToUnlock() {
  const [isPressing, setIsPressing] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    setIsPressing(true);
    // Begin 2-second countdown to unlock credentials
    timerRef.current = setTimeout(() => {
      setIsUnlocked(true);
      setIsPressing(false);
    }, 2000);
  };

  const handlePressEnd = () => {
    setIsPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText('archon_live_k8j3m9n0b2v1c8x7z6q5w4e3r2t1y0');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="hold-to-unlock"
      className="py-32 border-t border-black/5 relative z-10 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh]"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[270px] rounded-full bg-[#9cb080]/6 blur-[120px] pointer-events-none" />

      <div className="text-center space-y-4 mb-16">
        <h2 className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#618764] font-semibold">
          Credential Access
        </h2>
        <p className="font-sans font-semibold text-cream text-3xl md:text-5xl max-w-xl mx-auto leading-tight">
          Unlock your credentials.
        </p>
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* Locked State Button Container */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="text-center text-xs text-cream-dim leading-relaxed font-sans max-w-xs select-none">
                To prevent accidental generation, press and hold the button below for 2 seconds to initialize your credential token.
              </div>

              {/* The Hold-to-Unlock button using Emil's clip-path overlay rule */}
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                className="relative overflow-hidden pressable-btn border border-black/5 rounded-xl px-10 py-5 bg-black/2.5 flex items-center justify-center gap-3 w-full font-mono text-xs tracking-widest uppercase font-semibold text-cream cursor-pointer select-none active:scale-[0.97] transition-all"
              >
                {/* Hold progress colored overlay utilizing clip-path */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#2b5748] to-[#618764] z-0"
                  style={{
                    clipPath: isPressing ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                    transition: isPressing ? 'clip-path 2000ms linear' : 'clip-path 200ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                />

                {/* Button Content (Floats above overlay) */}
                <span className="relative z-10 flex items-center gap-2">
                  <Lock className={`h-4.5 w-4.5 transition-transform duration-300 ${isPressing ? 'scale-110 rotate-12 text-white' : 'text-cream-dim'}`} />
                  {isPressing ? 'Generating Module...' : 'Hold to Initialize'}
                </span>
              </button>
            </motion.div>
          ) : (
            /* Unlocked State Token Box */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel w-full rounded-2xl p-6 border border-[#618764]/20 bg-[#618764]/5 flex flex-col gap-6"
            >
              <div className="flex items-center gap-3 select-none">
                <div className="h-9 w-9 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center border border-emerald-600/20">
                  <Unlock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-mono tracking-widest uppercase text-cream">
                    Credentials Active
                  </h4>
                  <p className="text-[10px] text-emerald-700 font-mono tracking-wide uppercase">
                    Initial handshake complete
                  </p>
                </div>
              </div>

              {/* API Token Key field */}
              <div className="flex items-center gap-2 border border-black/5 bg-[#fcfbf9] rounded-xl px-4 py-3 text-xs font-mono justify-between text-cream-dim">
                <div className="flex items-center gap-2 truncate pr-4">
                  <Key className="h-4 w-4 text-[#2b5748] flex-shrink-0" />
                  <span className="truncate">archon_live_k8j3m9n0b2v1c8x7z6q5w4e3r2t1y0</span>
                </div>
                <button
                  onClick={copyKey}
                  className="pressable-btn p-2 rounded-lg bg-black/2.5 border border-black/5 hover:border-black/10 text-cream-dim hover:text-[#2b5748]"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
