'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Disable custom cursor on devices that do not support hover (touch devices)
    if (window.matchMedia('(hover: none)').matches) return;

    setIsVisible(true);

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = 0, my = 0; // Mouse coords
    let rx = 0, ry = 0; // Ring coords (lerped)
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = `${mx}px`;
      dot.style.top = `${my}px`;
    };

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const animateRing = () => {
      rx = lerp(rx, mx, 0.12);
      ry = lerp(ry, my, 0.12);
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      rafId = requestAnimationFrame(animateRing);
    };

    animateRing();

    const addHoverEffect = () => {
      dot.classList.add('hovered');
      ring.classList.add('hovered');
    };

    const removeHoverEffect = () => {
      dot.classList.remove('hovered');
      ring.classList.remove('hovered');
    };

    window.addEventListener('mousemove', onMove);

    // Apply hover states to all pressable and interactive elements
    const attachHoverListeners = () => {
      const interactives = document.querySelectorAll('a, button, [data-hover], .pressable-btn, input, select');
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', addHoverEffect);
        el.addEventListener('mouseleave', removeHoverEffect);
      });
    };

    attachHoverListeners();

    // Use MutationObserver to watch for dynamically added elements and attach hover listeners
    const observer = new MutationObserver(attachHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div ref={ringRef} className="cursor-ring hidden md:block" />
      <div ref={dotRef} className="cursor-dot hidden md:block" />
    </>
  );
}
