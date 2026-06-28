import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faClock, faXmark } from '@fortawesome/free-solid-svg-icons';
import { getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } from '../utils/searchHistory';
import { useI18n } from '../i18n';

const SearchBar: FC = () => {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addSearchHistory(query.trim());
      setHistory(getSearchHistory());
      setShowHistory(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    setShowHistory(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleRemoveHistory = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    removeSearchHistory(q);
    setHistory(getSearchHistory());
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit}>
        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setHistory(getSearchHistory()); setShowHistory(true); }}
          placeholder={t('search.placeholder')}
          className="clear-glass-card bg-transparent border border-white/10 text-white placeholder-white/40 rounded-full py-3 pl-14 pr-8 w-full text-sm outline-none focus:border-white/30 transition-all"
        />
      </form>

      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/10 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[11px] font-bold text-white/40">{t('search.history')}</span>
            <button
              onClick={handleClearHistory}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {t('search.clear')}
            </button>
          </div>
          {history.map((q) => (
            <div
              key={q}
              onClick={() => handleHistoryClick(q)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <FontAwesomeIcon icon={faClock} className="text-[10px] text-white/30" />
              <span className="text-xs text-white/60 flex-1 truncate">{q}</span>
              <button
                onClick={(e) => handleRemoveHistory(e, q)}
                className="text-white/20 hover:text-white/50 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
