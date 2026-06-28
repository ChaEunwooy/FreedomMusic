import { useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const useVolumeDrag = () => {
  const { setVolume } = usePlayer();
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number>(0);

  const updateVolume = useCallback((clientX: number) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setVolume(Math.round(pct));
  }, [setVolume]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => updateVolume(e.clientX));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateVolume]);

  const startDrag = useCallback((clientX: number) => {
    isDraggingRef.current = true;
    updateVolume(clientX);
  }, [updateVolume]);

  return { volumeBarRef, startDrag };
};
