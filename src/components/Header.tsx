import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import SearchBar from './SearchBar';
import { useI18n } from '../i18n';

const Header: FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const goBack = useCallback(() => navigate(-1), [navigate]);
  const goForward = useCallback(() => navigate(1), [navigate]);

  return (
    <header className="flex items-center gap-6 mb-10">
      <div className="flex gap-6 shrink-0">
        <button
          onClick={goBack}
          className="text-white/30 hover:text-white/60 transition-colors"
          aria-label={t('back')}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          onClick={goForward}
          className="text-white/30 hover:text-white/60 transition-colors"
          aria-label={t('back')}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <div className="flex-1">
        <SearchBar />
      </div>
    </header>
  );
};

export default Header;
