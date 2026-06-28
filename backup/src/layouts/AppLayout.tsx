import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { FC } from 'react';
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';
import RightPanel from '../features/player/RightPanel';
import FullscreenPlayer from '../features/player/FullscreenPlayer';
import type { OriginRect } from '../features/player/FullscreenPlayer';
import type { NavView } from '../context/types';
import { loadConfig } from '../services/config';
import { useMood } from '../context/MoodContext';
import { MOOD_CONFIGS } from '../features/discover/moodData';
import RainEffect from '../features/discover/RainEffect';
import WindEffect from '../features/discover/WindEffect';
import SunEffect from '../features/discover/SunEffect';

const VALID_VIEWS: NavView[] = ['discover', 'library', 'leaderboard', 'playlists', 'settings'];

const AppLayout: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fullscreen, setFullscreen] = useState(false);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { mood } = useMood();

  const raw = location.pathname.slice(1) || 'discover';
  const activeView: NavView = VALID_VIEWS.includes(raw as NavView) ? (raw as NavView) : 'discover';

  useEffect(() => {
    loadConfig().then((res) => {
      const cfg = res.data || {};
      const theme = cfg.theme || 'midnight';
      const opacity = cfg.glass_bg_opacity !== undefined ? Number(cfg.glass_bg_opacity) : 1;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.setProperty('--glass-bg-opacity', String(opacity));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mood) {
      const theme = MOOD_CONFIGS[mood]?.theme;
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
      }
    }
  }, [mood]);

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, [handleResize]);

  const handleNavChange = (view: NavView) => {
    navigate(`/${view}`);
  };

  const openFullscreen = (rect: DOMRect) => {
    setOrigin({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    setFullscreen(true);
  };

  const isCompact = windowWidth < 1024;

  return (
    <div className="w-full h-screen overflow-hidden app-theme-bg relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {mood === 'happy' && <SunEffect />}
        {mood === 'sad' && <RainEffect />}
        {mood === 'calm' && <WindEffect />}
      </div>

      <div className="relative flex w-full h-full overflow-hidden transition-all duration-300">
        {!isCompact && <Sidebar activeView={activeView} onNavChange={handleNavChange} />}
        <MainContent isCompact={isCompact} />
        <RightPanel onOpenFullscreen={openFullscreen} isCompact={isCompact} />
      </div>
      <FullscreenPlayer open={fullscreen} origin={origin} onClose={() => setFullscreen(false)} />
    </div>
  );
};

export default AppLayout;
