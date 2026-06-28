import type { FC } from 'react';
import PlaylistCard from './PlaylistCard';
import { useData } from '../../context/DataContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '../../i18n';

const PlaylistGrid: FC = () => {
  const { t } = useI18n();
  const { playlists, loading, error, refreshPlaylists } = useData();

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-6 px-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-[28px] bg-white/5 mb-3" />
            <div className="h-3 bg-white/5 rounded w-3/4 mb-2" />
            <div className="h-2 bg-white/5 rounded w-1/2 mb-3" />
            <div className="space-y-1.5 px-0.5">
              <div className="h-8 bg-white/5 rounded-lg" />
              <div className="h-8 bg-white/5 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <FontAwesomeIcon icon={faMusic} className="text-3xl mb-3 opacity-30" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => refreshPlaylists()}
          className="mt-3 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors flex items-center gap-1"
        >
          <FontAwesomeIcon icon={faRefresh} className="text-[10px]" />
          {t('retry')}
        </button>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30">
        <FontAwesomeIcon icon={faMusic} className="text-3xl mb-3 opacity-30" />
        <p className="text-sm">{t('recommend.empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-x-6 gap-y-8 px-2">
      {playlists.slice(0, 10).map((list) => (
        <PlaylistCard key={list.id} playlist={list} />
      ))}
    </div>
  );
};

export default PlaylistGrid;
