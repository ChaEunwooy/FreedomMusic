import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { formatTime } from '../../utils/format';

const ProgressBar: FC = () => {
  const { audioRef, currentSong } = usePlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(0);

    const handleTimeUpdate = () => {
      if (!dragging.current) setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setCurrentTime(0);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    if (audio.duration) setDuration(audio.duration);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, currentSong?.id]);

  const seekTo = useCallback((clientX: number) => {
    const bar = barRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = ratio * audio.duration;
    audio.currentTime = time;
    setCurrentTime(time);
  }, [audioRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    seekTo(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => {
      if (dragging.current) seekTo(ev.clientX);
    };
    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [seekTo]);


  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mb-2 px-2">
      <div className="flex justify-between text-[10px] text-white/30 mb-1 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div
        ref={barRef}
        className="relative h-3 w-full flex items-center cursor-pointer group"
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden group-hover:h-[5px] transition-all">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
