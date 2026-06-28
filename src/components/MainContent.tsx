import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { FC } from 'react';
import Header from './Header';
import Banner from '../features/discover/Banner';
import RecommendSection from '../features/discover/RecommendSection';
import DailyRandom from '../features/discover/DailyRandom';
import LeaderboardPage from '../features/leaderboard/LeaderboardPage';
import PlaylistsPage from '../features/playlist/PlaylistsPage';
import PlaylistDetailView from '../features/playlist/PlaylistDetailView';
import MusicLibrary from '../features/library/MusicLibrary';
import SettingsPage from '../features/settings/SettingsPage';
import SearchPage from '../features/search/SearchPage';
import ArtistDetail from '../features/library/ArtistDetail';
import AlbumDetail from '../features/library/AlbumDetail';
import WeatherWidget from './WeatherWidget';
import { useI18n } from '../i18n';

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
    </main>
  );
};

export default MainContent;
