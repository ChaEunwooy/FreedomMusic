import { memo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeHigh, faVolumeLow, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useVolumeDrag } from '../../hooks/useVolumeDrag';

const VolumeControl: FC = memo(() => {
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

  const VolumeIcon = volume === 0 ? faVolumeXmark : volume < 50 ? faVolumeLow : faVolumeHigh;

  return (
    <div className="flex items-center gap-2.5 px-1 mt-1">
      <FontAwesomeIcon
        icon={VolumeIcon}
        className="text-white/35 text-[11px] cursor-pointer hover:text-white/60 transition-colors shrink-0"
        onClick={handleToggleMute}
      />
      <div
        className="flex-1 h-4 flex items-center relative group cursor-pointer"
        ref={volumeBarRef}
        onMouseDown={handleMouseDown}
      >
        <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            style={{ width: `${volume}%` }}
          />
        </div>
        <div
          className="absolute top-1/2 w-2 h-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ left: `calc(${volume}% - 4px)`, transform: 'translateY(-50%)' }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-7 text-right font-mono shrink-0">{volume}%</span>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';

export default VolumeControl;
