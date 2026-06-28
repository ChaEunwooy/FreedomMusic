import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export const useKeyboardShortcuts = () => {
  const {
    isPlaying, togglePlay, next, prev,
    volume, setVolume, audioRef,
  } = usePlayer();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            prev();
          } else if (audioRef?.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            next();
          } else if (audioRef?.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(100, volume + 5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 5));
          break;
        case 'KeyN':
          if (!e.ctrlKey && !e.metaKey) {
            next();
          }
          break;
        case 'KeyP':
          if (!e.ctrlKey && !e.metaKey) {
            prev();
          }
          break;
        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) {
            setVolume(volume === 0 ? 80 : 0);
          }
          break;
        case 'KeyL':
          if (!e.ctrlKey && !e.metaKey) {
            document.dispatchEvent(new CustomEvent('toggle-lyrics'));
          }
          break;
        case 'KeyF':
          if (!e.ctrlKey && !e.metaKey) {
            document.dispatchEvent(new CustomEvent('toggle-fullscreen'));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, togglePlay, next, prev, volume, setVolume, audioRef]);
};
