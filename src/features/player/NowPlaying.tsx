import { useState, useRef } from 'react';
import type { FC } from 'react';
import { useData } from '../../context/DataContext';
import { usePlayer } from '../../context/PlayerContext';
import { useI18n } from '../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartSimple, faFont, faImage, faExpand } from '@fortawesome/free-solid-svg-icons';
import AlbumCover from './AlbumCover';
import LyricPanel from './LyricPanel';
import LikeButton from '../../components/LikeButton';
import ProgressBar from './ProgressBar';
import PlayerControls from './PlayerControls';
import VolumeControl from './VolumeControl';

interface NowPlayingProps {
  onOpenFullscreen?: (rect: DOMRect) => void;
}

const NowPlaying: FC<NowPlayingProps> = ({ onOpenFullscreen }) => {
  const { currentSong } = useData();
  const { isPlaying } = usePlayer();
  const { t } = useI18n();
  const [showLyrics, setShowLyrics] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleExpand = () => {
    if (cardRef.current && onOpenFullscreen) {
      onOpenFullscreen(cardRef.current.getBoundingClientRect());
    }
  };

  return (
    <div ref={cardRef} className="clear-glass p-4 flex-[2] min-h-0 flex flex-col overflow-hidden cursor-pointer" onClick={handleExpand}>
      <div className="flex justify-between items-center mb-4 px-2 shrink-0">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{t('player.now_playing')}</span>
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faExpand}
            className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
            title={t('player.fullscreen')}
          />
          <FontAwesomeIcon
            icon={showLyrics ? faImage : faFont}
            onClick={(e) => { e.stopPropagation(); setShowLyrics(!showLyrics); }}
            className={`text-sm cursor-pointer transition-colors ${showLyrics ? 'text-cyan-400' : 'text-white/30 hover:text-white'}`}
            title={showLyrics ? t('player.view_cover') : t('player.view_lyrics')}
          />
          <FontAwesomeIcon icon={faChartSimple} className={`text-cyan-400 ${isPlaying && 'animate-pulse'}`} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {showLyrics ? (
          <LyricPanel />
        ) : (
          <div className="overflow-y-auto no-scrollbar h-full">
            <AlbumCover />
        {currentSong && (
          <div className="text-center mb-6">
            <h4 className="text-2xl font-bold text-white mb-2 leading-none">{currentSong.name}</h4>
            <div className="flex items-center justify-center gap-3">
              <p className="text-sm text-white/50 font-medium italic">{currentSong.ar?.[0]?.name ?? t('unknown_artist')}</p>
              <LikeButton songId={currentSong.id} />
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
        <ProgressBar />
        <PlayerControls  />
        <VolumeControl />
      </div>
    </div>
  );
};

export default NowPlaying;
