import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faXmark } from '@fortawesome/free-solid-svg-icons';

interface SleepTimerProps {
  onClear: () => void;
}

const SleepTimer: FC<SleepTimerProps> = ({ onClear }) => {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining <= 0) {
      onClear();
      return;
    }

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          document.dispatchEvent(new CustomEvent('sleep-timer-done'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [remaining, onClear]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
      <FontAwesomeIcon icon={faMoon} className="text-[10px] text-cyan-400 animate-pulse" />
      <span className="text-[11px] text-white/70 font-mono">{formatTime(remaining)}</span>
      <button
        onClick={() => { clearInterval(timerRef.current!); onClear(); }}
        className="text-white/30 hover:text-white/60 transition-colors"
      >
        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
      </button>
    </div>
  );
};

export default SleepTimer;
