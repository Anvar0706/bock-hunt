import { useState, useCallback, useRef } from 'react';

interface ParallaxStyle {
  transform: string;
  transition: string;
}

const STATIC_STYLE: ParallaxStyle = {
  transform: 'none',
  transition: 'none',
};

export function useParallax(maxDeg: number = 2.2) {
  const [style, setStyle] = useState<ParallaxStyle>({
    transform: 'none',
    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
  });
  const isInteracting = useRef(false);
  const rafId = useRef<number | null>(null);

  // Check if touch device: tilt is meaningless on mobile and causes severe 60Hz DOM thrashing
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (isTouch || e.pointerType === 'touch') return;
      if (rafId.current) return;

      const currentTarget = e.currentTarget;
      const clientX = e.clientX;
      const clientY = e.clientY;

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (!currentTarget) return;
        const rect = currentTarget.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Calculate degrees (capped at maxDeg)
        const rotateX = ((y - centerY) / centerY) * -maxDeg;
        const rotateY = ((x - centerX) / centerX) * maxDeg;

        setStyle({
          transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
          transition: isInteracting.current ? 'transform 0.08s ease-out' : 'transform 0.2s ease-out',
        });
        isInteracting.current = true;
      });
    },
    [maxDeg, isTouch]
  );

  const handlePointerLeave = useCallback(() => {
    if (isTouch) return;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    isInteracting.current = false;
    setStyle({
      transform: 'none',
      transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, [isTouch]);

  if (isTouch) {
    return {
      style: STATIC_STYLE,
      bind: {},
    };
  }

  return {
    style,
    bind: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}
