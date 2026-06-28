import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faBackwardStep, faForwardStep, faShuffle, faGaugeHigh, faArrowRightArrowLeft, faRepeat, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { faRepeat as faRepeatOne } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useI18n } from '../../i18n';
import type { PlayMode } from '../../context/PlayerContext';

const MODE_ICONS: Record<PlayMode, typeof faRepeat> = {
  'sequence': faArrowRightArrowLeft,
  'shuffle': faShuffle,
  'repeat-one': faRepeatOne,
  'repeat-all': faRotateRight,
};

const MODE_LABELS: Record<PlayMode, string> = {
  'sequence': 'sequence',
  'shuffle': 'shuffle',
  'repeat-one': 'repeat_one',
  'repeat-all': 'repeat_all',
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerControlsProps {
  variant?: 'panel' | 'fullscreen';
}

const PlayerControls: FC<PlayerControlsProps> = ({ variant = 'panel' }) => {
  const { isPlaying, togglePlay, next, prev, playMode, cyclePlayMode, playbackRate, setPlaybackRate } = usePlayer();
  const { t } = useI18n();
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);

  const selectSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedPopup(false);
  }, [setPlaybackRate]);

  if (variant === 'fullscreen') {
    return (
      <div className="flex items-center justify-center gap-3">
        <div className="relative group/mode mr-2">
          <FontAwesomeIcon
            icon={MODE_ICONS[playMode]}
            onClick={cyclePlayMode}
            className={`text-sm cursor-pointer transition-colors ${
              playMode === 'sequence' ? 'text-white/30 hover:text-white' : 'text-cyan-400 hover:text-cyan-300'
            }`}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-black/80 text-[10px] text-white whitespace-nowrap opacity-0 group-hover/mode:opacity-100 pointer-events-none transition-opacity duration-200">
            {t('playmode.' + MODE_LABELS[playMode])}
          </div>
        </div>
        <FontAwesomeIcon
          icon={faBackwardStep}
          onClick={prev}
          className="text-white/30 hover:text-white text-base cursor-pointer transition-colors"
        />
        <div
          onClick={togglePlay}
          className="w-11 h-11 clear-glass-card rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-lg ml-0.5" />
        </div>
        <FontAwesomeIcon
          icon={faForwardStep}
          onClick={next}
          className="text-white/30 hover:text-white text-base cursor-pointer transition-colors"
        />
        <div className="relative shrink-0 w-7 text-right ml-[10px]">
          <div
            onClick={() => setShowSpeedPopup(!showSpeedPopup)}
            className="inline-flex items-center gap-1 cursor-pointer select-none"
          >
            <FontAwesomeIcon
              icon={faGaugeHigh}
              className={`text-xs transition-colors ${
                playbackRate !== 1 ? 'text-cyan-400' : 'text-white/30 hover:text-white'
              }`}
            />
            <span className={`text-[10px] font-mono transition-colors ${
              playbackRate !== 1 ? 'text-cyan-400' : 'text-white/30 hover:text-white'
            }`}>
              {playbackRate}x
            </span>
          </div>
          {showSpeedPopup && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSpeedPopup(false)} />
              <div className="absolute bottom-full right-0 translate-x-[30px] mb-2 z-50 bg-white/10 rounded-xl py-1 min-w-[70px] shadow-xl border border-white/15">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => selectSpeed(rate)}
                    className={`w-full px-3 py-1.5 text-[11px] text-left transition-colors ${
                      rate === playbackRate ? 'text-cyan-400' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {rate === 1 ? t('equalizer.default') : `${rate}x`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative group/mode mr-2">
        <FontAwesomeIcon
          icon={MODE_ICONS[playMode]}
          onClick={cyclePlayMode}
          className={`text-sm cursor-pointer transition-colors ${
            playMode === 'sequence' ? 'text-white/30 hover:text-white' : 'text-cyan-400 hover:text-cyan-300'
          }`}
        />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-black/80 text-[10px] text-white whitespace-nowrap opacity-0 group-hover/mode:opacity-100 pointer-events-none transition-opacity duration-200">
          {t('playmode.' + MODE_LABELS[playMode])}
        </div>
      </div>
      <FontAwesomeIcon
        icon={faBackwardStep}
        onClick={prev}
        className="text-white/30 hover:text-white text-base cursor-pointer transition-colors"
      />
      <div
        onClick={togglePlay}
        className="w-11 h-11 clear-glass-card rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-lg ml-0.5" />
      </div>
      <FontAwesomeIcon
        icon={faForwardStep}
        onClick={next}
        className="text-white/30 hover:text-white text-base cursor-pointer transition-colors"
      />
      <div className="relative shrink-0 w-7 text-right ml-[10px]">
        <div
          onClick={() => setShowSpeedPopup(!showSpeedPopup)}
          className="inline-flex items-center gap-1 cursor-pointer select-none"
        >
          <FontAwesomeIcon
            icon={faGaugeHigh}
            className={`text-xs transition-colors ${
              playbackRate !== 1 ? 'text-cyan-400' : 'text-white/30 hover:text-white'
            }`}
          />
          <span className={`text-[10px] font-mono transition-colors ${
            playbackRate !== 1 ? 'text-cyan-400' : 'text-white/30 hover:text-white'
          }`}>
            {playbackRate}x
          </span>
        </div>
        {showSpeedPopup && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSpeedPopup(false)} />
              <div className="absolute bottom-full right-0 translate-x-[30px] mb-2 z-50 bg-white/10 rounded-xl py-1 min-w-[70px] shadow-xl border border-white/15">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => selectSpeed(rate)}
                    className={`w-full px-3 py-1.5 text-[11px] text-left transition-colors ${
                      rate === playbackRate ? 'text-cyan-400' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {rate === 1 ? t('equalizer.default') : `${rate}x`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }  ;

export default PlayerControls;
