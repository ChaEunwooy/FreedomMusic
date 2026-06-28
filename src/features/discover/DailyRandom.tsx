import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShuffle, faPlay, faClock, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { getSongUrl, getTopSongs } from '../../services/api';
import { formatDuration } from '../../utils/format';
import { usePlayer } from '../../context/PlayerContext';
import { useData } from '../../context/DataContext';
import SongMenu from '../../components/SongMenu';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';
import { useI18n } from '../../i18n';

interface HotSong {
  id: number;
  name: string;
  artist: string;
  cover: string;
  duration: number;
}

const DailyRandom: FC = () => {
  const { t } = useI18n();
  const [songs, setSongs] = useState<HotSong[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, setQueue } = usePlayer();
  const { currentSong } = useData();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getDailyCache<HotSong[]>('daily_random').then((cached) => {
      if (cancelled) return;
      if (cached?.length) {
        setSongs(cached);
        setLoading(false);
        return;
      }

      getTopSongs(0).then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        if (!data?.length) return;
        const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 15);
        const result = shuffled.map((s: any) => ({
          id: s.id,
          name: s.name,
          artist: s.artists?.[0]?.name ?? t('unknown'),
          cover: s.album?.picUrl ?? '',
          duration: s.duration ?? 0,
        }));
        setSongs(result);
        setDailyCache('daily_random', result);
      }).catch(() => {}).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => { cancelled = true; };
  }, []);

  const playSong = async (song: HotSong) => {
    try {
      const res = await getSongUrl(song.id);
      const urlData = res.data.data?.[0];
      if (!urlData?.url) return;
      play({ id: song.id, name: song.name, ar: [{ name: song.artist }], al: { picUrl: song.cover }, url: urlData.url });
    } catch {}
  };

  const playAll = useCallback(async () => {
    if (!songs.length) return;
    const withUrl = await Promise.allSettled(
      songs.map(async (s) => {
        const res = await getSongUrl(s.id);
        const url = res.data.data?.[0]?.url;
        return { ...s, url };
      })
    );
    const valid = withUrl
      .filter((r): r is PromiseFulfilledResult<HotSong & { url: string }> => r.status === 'fulfilled' && r.value.url)
      .map((r) => ({ id: r.value.id, name: r.value.name, ar: [{ name: r.value.artist }], al: { picUrl: r.value.cover }, dt: r.value.duration, url: r.value.url }));
    if (!valid.length) return;
    setQueue(valid);
    play(valid[0]);
  }, [songs, setQueue, play]);



  if (loading) {
    return (
      <div className="mt-10 px-2">
        <div className="flex items-center gap-3 mb-6">
          <FontAwesomeIcon icon={faShuffle} className="text-cyan-400" />
          <h3 className="text-xl font-bold text-white tracking-tight">{t('daily.today')}</h3>
        </div>
        <div className="flex items-center justify-center py-10 text-white/30">
          <FontAwesomeIcon icon={faSpinner} className="text-xl animate-spin" />
        </div>
      </div>
    );
  }

  if (songs.length === 0) return null;

  return (
    <div className="mt-10 px-2">
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon icon={faShuffle} className="text-cyan-400" />
        <h3 className="text-xl font-bold text-white tracking-tight">{t('daily.today')}</h3>
        <button
          onClick={playAll}
          className="flex items-center gap-1.5 ml-3 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-400 text-[11px] font-medium hover:bg-cyan-400/20 transition-colors"
        >
          <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
          <span>{t('daily.play_all')}</span>
        </button>
        <button
          onClick={() => {
            setSongs((prev) => [...prev].sort(() => Math.random() - 0.5));
          }}
          className="ml-auto text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          {t('daily.refresh')}
        </button>
      </div>

      <div className="space-y-1">
        {songs.map((song, i) => {
          const isPlaying = currentSong?.id === song.id;
          return (
            <div
              key={song.id}
              onClick={() => playSong(song)}
              className={`flex items-center px-4 py-2.5 rounded-xl cursor-pointer transition-all group ${
                isPlaying
                  ? 'bg-cyan-400/10 border border-cyan-400/20'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`w-8 text-center text-xs ${isPlaying ? 'text-cyan-400' : 'text-white/20'}`}>
                {isPlaying ? <FontAwesomeIcon icon={faPlay} className="text-[10px]" /> : i + 1}
              </span>

              {song.cover ? (
                <img src={song.cover + '?param=60y60'} className="w-9 h-9 rounded-lg object-cover mx-3 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mx-3 shrink-0">
                  <FontAwesomeIcon icon={faPlay} className="text-[10px] text-white/20" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isPlaying ? 'text-cyan-400' : 'text-white/80'}`}>{song.name}</p>
                <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
              </div>

              <div className="flex items-center gap-4 ml-4">
                <FontAwesomeIcon icon={faClock} className="text-[8px] text-white/15" />
                <span className="text-[10px] text-white/25 font-mono w-10 text-right">{formatDuration(song.duration)}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <SongMenu song={{ id: song.id, name: song.name, ar: [{ name: song.artist }], al: { picUrl: song.cover } }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyRandom;
