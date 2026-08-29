import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faMusic, faPause, faClock, faSearch, faXmark, faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { getToplist, getPlaylistTrackAll, getSongUrl } from '../../services/api';
import { formatDuration } from '../../utils/format';
import { usePlayer } from '../../context/PlayerContext';
import { useData } from '../../context/DataContext';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';
import { useI18n } from '../../i18n';

interface Toplist {
  id: number;
  name: string;
  trackCount: number;
  coverImgUrl: string;
  updateFrequency?: string;
}

interface Track {
  id: number;
  name: string;
  ar: { name: string }[];
  al: { picUrl: string };
  dt: number;
}

const LeaderboardPage: FC = () => {
  const [allCharts, setAllCharts] = useState<Toplist[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCount, setShowCount] = useState(30);
  const { play, togglePlay, setQueue } = usePlayer();
  const { currentSong } = useData();
  const { t } = useI18n();

  const HIDDEN_CHARTS = new Set([
    '网易云古典榜', '网易云电音榜',
    '音乐合伙人推荐榜', '音乐合伙人热歌榜', '音乐合伙人留名榜',
    '音乐合伙人高分新歌榜', '音乐合伙人高分榜',
  ]);

  const charts = useMemo(() => {
    const filtered = allCharts.filter(c => !HIDDEN_CHARTS.has(c.name));
    if (!searchQuery.trim()) return filtered.slice(0, 20);
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter(c => c.name.toLowerCase().includes(q));
  }, [allCharts, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = await getDailyCache<Toplist[]>('toplist_charts');
      if (cancelled) return;
      if (cached?.length) {
        setAllCharts(cached);
        setSelected(cached[0].id);
        return;
      }
      try {
        const res = await getToplist();
        if (cancelled) return;
        const list = (res.data.list || []).filter((c: Toplist) => !HIDDEN_CHARTS.has(c.name));
        if (list.length) {
          setAllCharts(list);
          setSelected(list[0].id);
          setDailyCache('toplist_charts', list);
        }
      } catch {}
    };

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setTracks([]);
    setShowCount(30);
    let cancelled = false;

    const cacheKey = `toplist_tracks_${selected}`;

    const loadTracks = async () => {
      const cached = await getDailyCache<Track[]>(cacheKey);
      if (cancelled) return;
      if (cached?.length) {
        setTracks(cached);
        setLoading(false);
        return;
      }
      await fetchTracks();
    };

    const fetchTracks = async () => {
      let offset = 0;
      const batchSize = 100;
      const allSongs: Track[] = [];

      const fetchNext = async () => {
        if (cancelled) return;
        try {
          const res = await getPlaylistTrackAll(selected, batchSize, offset);
          const songs = res.data.songs || [];
          if (songs.length === 0) {
            if (!cancelled) {
              setLoading(false);
              if (allSongs.length) setDailyCache(cacheKey, allSongs);
            }
            return;
          }
          allSongs.push(...songs);
          offset += songs.length;
          if (!cancelled) {
            setTracks([...allSongs]);
            if (songs.length >= batchSize) {
              setTimeout(fetchNext, 100);
            } else {
              setLoading(false);
              setDailyCache(cacheKey, allSongs);
            }
          }
        } catch {
          if (!cancelled) setLoading(false);
        }
      };

      setTimeout(fetchNext, 100);
    };

    loadTracks();
    return () => { cancelled = true; };
  }, [selected]);

  const playTrack = async (track: Track) => {
    if (currentSong?.id === track.id) {
      togglePlay();
      return;
    }
    try {
      const res = await getSongUrl(track.id);
      const urlData = res.data.data?.[0];
      if (!urlData?.url) return;
      play({ ...track, url: urlData.url });
    } catch {
      // song url unavailable
    }
  };

  const playAll = async () => {
    if (!tracks.length) return;
    setQueue(tracks.map((t) => ({
      id: t.id,
      name: t.name,
      ar: t.ar,
      al: t.al,
      dt: t.dt,
    })));
    await playTrack(tracks[0]);
  };


  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部分类 + 搜索 */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-extrabold text-white tracking-tight shrink-0">{t('leaderboard.title')}</h2>
          <div className="relative flex-1">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30" />
            <input
              type="text"
              placeholder={t('leaderboard.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-8 rounded-full bg-white/5 border border-white/8 text-[11px] text-white placeholder-white/30 outline-none focus:border-cyan-400/40 focus:bg-white/8 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {charts.map((chart) => {
            const isActive = selected === chart.id;
            return (
              <button
                key={chart.id}
                onClick={() => setSelected(chart.id)}
                className={`h-8 px-4 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-400/30 scale-105'
                    : 'bg-white/6 text-white/45 hover:bg-white/10 hover:text-white/70 border border-white/6 hover:border-white/12 hover:scale-[1.02]'
                }`}
              >
                {chart.name}
              </button>
            );
          })}
          {charts.length === 0 && (
            <p className="text-[11px] text-white/30 py-2">{t('leaderboard.no_match')}</p>
          )}
        </div>
      </div>

      {/* 歌曲列表区 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 表头 - 固定在滚动区外面 */}
        <div className="shrink-0 px-6 pt-3 pb-2">
          <div className="flex items-center px-3 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-wider clear-glass-card rounded-xl">
            <span className="w-8 text-center">#</span>
            <span className="flex-1 px-2">{t('library.tab.songs')}</span>
            <span className="w-32 px-2 hidden lg:block">{t('library.tab.artists')}</span>
            <span className="w-16 text-right px-2">
              <FontAwesomeIcon icon={faClock} className="text-[8px]" />
            </span>
          </div>

          {!loading && tracks.length > 0 && (
            <button
              onClick={playAll}
              className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
            >
              <FontAwesomeIcon icon={faPlayCircle} className="text-xs" />
              <span className="text-[11px] font-medium">{t('daily.play_all')}</span>
            </button>
          )}
        </div>

        {/* 歌曲列表 - 只有这里滚动 */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6">

        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/30">
            <FontAwesomeIcon icon={faMusic} className="text-xl animate-pulse" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/30">
            <FontAwesomeIcon icon={faFire} className="text-2xl mb-3 opacity-30" />
            <p className="text-sm">{t('leaderboard.no_data')}</p>
          </div>
        ) : (
          <>
            {tracks.slice(0, showCount).map((track, i) => {
            const isPlaying = currentSong?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                  isPlaying
                    ? 'bg-cyan-400/10 border border-cyan-400/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`w-8 text-center text-xs ${isPlaying ? 'text-cyan-400 font-bold' : 'text-white/25'}`}>
                  {isPlaying ? (
                    <FontAwesomeIcon icon={faPause} className="text-[10px]" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="flex-1 flex items-center gap-3 px-2 min-w-0">
                  <img src={track.al.picUrl + '?param=60y60'} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <span className={`text-xs truncate ${isPlaying ? 'text-cyan-400 font-medium' : 'text-white/80'}`}>{track.name}</span>
                </div>
                <span className="w-32 px-2 text-xs text-white/40 truncate hidden lg:block">{track.ar?.[0]?.name}</span>
                <span className="w-16 text-right px-2 text-[10px] text-white/25 font-mono">{formatDuration(track.dt)}</span>
              </div>
            );
          })}
            {showCount < tracks.length && (
              <button
                onClick={() => setShowCount(prev => Math.min(prev + 50, tracks.length))}
                className="w-full py-3 mt-2 rounded-xl bg-white/5 text-[11px] text-white/40 hover:bg-white/8 hover:text-white/60 transition-all"
              >
                {tracks.length - showCount > 50
                  ? t('leaderboard.load_more', {count: tracks.length - showCount})
                  : t('leaderboard.show_rest', {count: tracks.length - showCount})}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  </div>
  );
};

export default LeaderboardPage;
