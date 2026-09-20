import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { FC } from 'react';
import Header from './Header';
import Banner from '../features/discover/Banner';
import RecommendSection from '../features/discover/RecommendSection';
import DailyRandom from '../features/discover/DailyRandom';
import WeatherWidget from './WeatherWidget';
import ErrorBoundary from './ErrorBoundary';
import { useI18n } from '../i18n';

// 路由代码分割（按需加载页面 chunk，降低首屏体积）
const LeaderboardPage = lazy(() => import('../features/leaderboard/LeaderboardPage'));
const PlaylistsPage = lazy(() => import('../features/playlist/PlaylistsPage'));
const PlaylistDetailView = lazy(() => import('../features/playlist/PlaylistDetailView'));
const MusicLibrary = lazy(() => import('../features/library/MusicLibrary'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const SearchPage = lazy(() => import('../features/search/SearchPage'));
const ArtistDetail = lazy(() => import('../features/library/ArtistDetail'));
const AlbumDetail = lazy(() => import('../features/library/AlbumDetail'));

const RouteLoadingFallback: FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-3 text-white/40">
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[var(--theme-accent,#22d3ee)] animate-spin" />
      <span className="text-xs font-medium tracking-wide">加载中...</span>
    </div>
  </div>
);

function getGreetingInfo() {
  const h = new Date().getHours();
  if (h >= 6 && h < 9) return { textKey: 'greeting.morning', subKey: 'greeting.morning_sub', icon: 'faCloudSun' };
  if (h >= 9 && h < 12) return { textKey: 'greeting.late_morning', subKey: 'greeting.late_morning_sub', icon: 'faSun' };
  if (h >= 12 && h < 14) return { textKey: 'greeting.noon', subKey: 'greeting.noon_sub', icon: 'faSun' };
  if (h >= 14 && h < 18) return { textKey: 'greeting.afternoon', subKey: 'greeting.afternoon_sub', icon: 'faCloudSun' };
  if (h >= 18 && h < 21) return { textKey: 'greeting.evening', subKey: 'greeting.evening_sub', icon: 'faCloudMoon' };
  if (h >= 21 && h < 24) return { textKey: 'greeting.night', subKey: 'greeting.night_sub', icon: 'faMoon' };
  return { textKey: 'greeting.late_night', subKey: 'greeting.late_night_sub', icon: 'faMoon' };
}

const DiscoverPage: FC = () => {
  const { t } = useI18n();
  const [greeting, setGreeting] = useState(getGreetingInfo);

  useEffect(() => {
    const timer = setInterval(() => setGreeting(getGreetingInfo()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Header />
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">{t(greeting.textKey)}</h1>
          <p className="text-white/50 font-medium">{t(greeting.subKey)}</p>
        </div>
        <WeatherWidget />
      </div>
      <Banner />
      <RecommendSection />
      <DailyRandom />
    </>
  );
};

interface MainContentProps {
  isCompact?: boolean;
}

const MainContent: FC<MainContentProps> = ({ isCompact }) => {
  return (
    <main className={`flex-1 flex flex-col ${isCompact ? 'p-6 pb-16' : 'p-12 pb-20'} overflow-y-auto no-scrollbar`}>
      <ErrorBoundary fallbackTitle="页面内容加载异常">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route index element={<DiscoverPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlist/:id" element={<PlaylistDetailView />} />
            <Route path="library" element={<MusicLibrary />} />
            <Route path="library/:tab" element={<MusicLibrary />} />
            <Route path="artist/:id" element={<ArtistDetail />} />
            <Route path="album/:id" element={<AlbumDetail />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="search" element={<SearchPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </main>
  );
};

export default MainContent;
