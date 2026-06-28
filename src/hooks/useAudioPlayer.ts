import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const useAudioPlayer = () => {
  const { audioRef, currentSong, setProgress, next } = usePlayer();
  const rafRef = useRef(0);
  const lastEndRef = useRef(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
    };

    const handleEnded = () => {
      const now = Date.now();
      if (now - lastEndRef.current < 500) return;
      lastEndRef.current = now;
      next();
    };

    const handleError = () => {
      audio.pause();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, currentSong?.id, setProgress, next]);
};
