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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faCloudSun, faCloudMoon, faCloud } from '@fortawesome/free-solid-svg-icons';

function getGreetingInfo() {
  const h = new Date().getHours();
  if (h >= 6 && h < 9) return { text: '早上好', sub: '新的一天从音乐开始', icon: faCloudSun };
  if (h >= 9 && h < 12) return { text: '上午好', sub: '工作学习来点背景音乐', icon: faSun };
  if (h >= 12 && h < 14) return { text: '中午好', sub: '午休时光，放松一下', icon: faSun };
  if (h >= 14 && h < 18) return { text: '下午好', sub: '让音乐陪你度过下午', icon: faCloudSun };
  if (h >= 18 && h < 21) return { text: '晚上好', sub: '华灯初上，音乐相伴', icon: faCloudMoon };
  if (h >= 21 && h < 24) return { text: '夜深了', sub: '放下疲惫，聆听旋律', icon: faMoon };
  return { text: '夜深了', sub: '早点休息，晚安', icon: faMoon };
}

function getWeatherInfo() {
  const h = new Date().getHours();
  if (h >= 6 && h < 18) return { temp: '26°C', desc: '晴', icon: faSun, color: 'text-orange-400' };
  if (h >= 18 && h < 21) return { temp: '22°C', desc: '多云', icon: faCloud, color: 'text-slate-400' };
  return { temp: '19°C', desc: '晴', icon: faMoon, color: 'text-blue-300' };
}

const DiscoverPage: FC = () => {
  const [greeting, setGreeting] = useState(getGreetingInfo);
  const [weather] = useState(getWeatherInfo);

  useEffect(() => {
    const timer = setInterval(() => setGreeting(getGreetingInfo()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Header />
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">{greeting.text}</h1>
          <p className="text-white/50 font-medium">{greeting.sub}</p>
        </div>
        <div className="clear-glass-card flex items-center gap-3 py-2.5 px-5">
          <FontAwesomeIcon icon={weather.icon} className={`${weather.color} text-lg`} />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">{weather.temp}</span>
            <span className="text-[10px] text-white/40">{weather.desc}</span>
          </div>
        </div>
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
        <Route path="settings" element={<SettingsPage />} />
        <Route path="search" element={<SearchPage />} />
      </Routes>
    </main>
  );
};

export default MainContent;
