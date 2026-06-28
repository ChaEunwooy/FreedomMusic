import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh, faSpinner } from '@fortawesome/free-solid-svg-icons';
import PlaylistGrid from './PlaylistGrid';
import { useData } from '../../context/DataContext';
import { useI18n } from '../../i18n';

const RecommendSection: FC = () => {
  const { t } = useI18n();
  const { refreshPlaylists, loading } = useData();

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xl font-bold text-white tracking-tight">{t('recommend.for_you')}</h3>
        <button
          onClick={() => refreshPlaylists()}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
        >
          <FontAwesomeIcon
        
            icon={loading ? faSpinner : faRefresh}
            className={`text-[5px] ${loading ? 'animate-spin' : ''}` }
          />
          {t('recommend.refresh')}
        </button>
      </div>
      <PlaylistGrid />
    </div>
  );
};

export default RecommendSection;
