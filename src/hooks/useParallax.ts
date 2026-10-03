import { useState, useCallback, useRef } from 'react';

interface ParallaxStyle {
  transform: string;
  transition: string;
}

export function useParallax(maxDeg: number = 2.2) {
  const [style, setStyle] = useState<ParallaxStyle>({
    transform: 'none',
    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
  });
  const isInteracting = useRef(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

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
    },
    [maxDeg]
  );

  const handlePointerLeave = useCallback(() => {
    isInteracting.current = false;
    setStyle({
      transform: 'none',
      transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = Math.max(-maxDeg, Math.min(maxDeg, ((y - centerY) / centerY) * -maxDeg));
      const rotateY = Math.max(-maxDeg, Math.min(maxDeg, ((x - centerX) / centerX) * maxDeg));

      setStyle({
        transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
        transition: 'transform 0.1s ease-out',
      });
    },
    [maxDeg]
  );

  const handleTouchEnd = useCallback(() => {
    setStyle({
      transform: 'none',
      transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, []);

  return {
    style,
    bind: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
