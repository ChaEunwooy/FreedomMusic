import { memo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeHigh, faVolumeLow, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useVolumeDrag } from '../../hooks/useVolumeDrag';

interface VolumeControlProps {
  className?: string;
}

const VolumeControl: FC<VolumeControlProps> = memo(({ className = '' }) => {
  const { volume, setVolume } = usePlayer();
  const { volumeBarRef, startDrag } = useVolumeDrag();
  const prevVolume = useRef(80);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientX);
  }, [startDrag]);

  const handleToggleMute = useCallback(() => {
    if (volume === 0) {
      setVolume(prevVolume.current || 80);
    } else {
      prevVolume.current = volume;
      setVolume(0);
    }
  }, [volume, setVolume]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 5 : -5;
    setVolume(Math.min(100, Math.max(0, volume + delta)));
  }, [volume, setVolume]);

  const VolumeIcon = volume === 0 ? faVolumeXmark : volume < 50 ? faVolumeLow : faVolumeHigh;

  return (
    <div
      className={`flex items-center gap-2.5 px-1 select-none group/vol ${className}`}
      onWheel={handleWheel}
      title="点击、拖拽或滚轮调节音量"
    >
      <FontAwesomeIcon
        icon={VolumeIcon}
        className="text-white/40 text-xs cursor-pointer hover:text-white transition-colors shrink-0"
        onClick={handleToggleMute}
      />
      <div
        className="flex-1 h-5 flex items-center relative cursor-pointer"
        ref={volumeBarRef}
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-1 bg-white/15 rounded-full overflow-hidden group-hover/vol:h-1.5 transition-all">
          <div
            className="h-full bg-gradient-to-r from-[var(--theme-accent,#22d3ee)] to-blue-500 rounded-full"
            style={{ width: `${volume}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-0 group-hover/vol:opacity-100 transition-opacity duration-150 pointer-events-none"
          style={{ left: `calc(${volume}% - 5px)`, transform: 'translateY(-50%)' }}
        />
      </div>
      <span className="text-[10px] text-white/40 w-7 text-right font-mono shrink-0">{volume}%</span>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';

export default VolumeControl;
