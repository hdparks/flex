'use client';
import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || touchStartY.current === 0) return;
    
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, MAX_PULL);
      setPullDistance(distance);
      setPulling(distance >= PULL_THRESHOLD);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pulling && onRefresh) {
      onRefresh();
    }
    touchStartY.current = 0;
    isPulling.current = false;
    setPulling(false);
    setPullDistance(0);
  }, [pulling, onRefresh]);

  return {
    pulling,
    pullDistance,
    pullHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
