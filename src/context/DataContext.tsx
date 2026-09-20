import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Playlist, DailySong, Song, PlaylistSong } from './types';
import { getRecommendPlaylists, getHotPlaylists, getPlaylistDetail, getDailyRecommend } from '../services/api';
import { useAuth } from './AuthContext';
import { getDailyCache, setDailyCache } from '../utils/dailyCache';

interface DataContextType {
  playlists: Playlist[];
  dailySongs: DailySong[];
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  loading: boolean;
  error: string;
  refreshPlaylists: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

const PAGE_SIZE = 10;
const MAX_OFFSET = 300;

async function fetchPlaylistsWithSongs(items: { id: number; name: string; picUrl: string; playCount?: number; trackCount?: number; creator?: { nickname: string } }[]): Promise<Playlist[]> {
  const base: Playlist[] = items.map((item) => ({
    ...item,
    songs: undefined,
  }));

  const songResults = await Promise.allSettled(
    base.map((pl) =>
      getPlaylistDetail(pl.id).then((r) => {
        const tracks = r.data.playlist?.tracks;
        if (!tracks?.length) return { id: pl.id, songs: [] as PlaylistSong[] };
        return {
          id: pl.id,
          songs: tracks.slice(0, 2).map((t: Record<string, unknown>) => ({
            id: t.id as number,
            name: t.name as string,
            ar: (t.ar as { name: string }[]) || [],
            al: (t.al as { picUrl: string }) || { picUrl: '' },
          })),
        };
      })
    )
  );

  return base.map((pl) => {
    const found = songResults.find(
      (r) => r.status === 'fulfilled' && r.value.id === pl.id
    );
    if (found && found.status === 'fulfilled' && found.value.songs.length > 0) {
      return { ...pl, songs: found.value.songs };
    }
    return pl;
  });
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { authState } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [dailySongs, setDailySongs] = useState<DailySong[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const offset = Math.floor(Math.random() * MAX_OFFSET);
      const res = await getHotPlaylists(PAGE_SIZE, offset);
      const list = res.data.playlists;
      if (!list?.length) {
        setPlaylists([]);
        return;
      }

      const items: Playlist[] = list.map((item: Record<string, unknown>) => ({
        id: item.id as number,
        name: item.name as string,
        picUrl: (item.coverImgUrl || item.picUrl) as string,
        playCount: item.playCount as number | undefined,
        trackCount: item.trackCount as number | undefined,
        creator: item.creator as { nickname: string } | undefined,
      }));

      // 立即展示，不等待详情
      setPlaylists(items);
      setLoading(false);

      // 后台静默增强前 6 个歌单的歌曲预览
      fetchPlaylistsWithSongs(items.slice(0, 6)).then((enhanced) => {
        setPlaylists((prev) => {
          const map = new Map(enhanced.map((e) => [e.id, e]));
          return prev.map((p) => map.get(p.id) || p);
        });
      }).catch(() => {});
    } catch (err) {
      console.error('无法连接到网易云 API', err);
      setError('无法连接到网易云 API，请确认后端服务已启动');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState === 'checking') return;
    const controller = new AbortController();

    (async () => {
      try {
        // 1. 优先读取瞬间缓存 (0ms 秒开)
        const cached = await getDailyCache<Playlist[]>('recommend_playlists');
        if (controller.signal.aborted) return;
        if (cached?.length) {
          setPlaylists(cached);
          setLoading(false);
          // 异步静默校验更新
        }

        if (!cached?.length) {
          setLoading(true);
        }
        setError('');

        const res = await getRecommendPlaylists(PAGE_SIZE);
        const result = res.data.result;
        if (!result?.length) {
          if (!cached?.length) setPlaylists([]);
          setLoading(false);
          return;
        }

        const items: Playlist[] = result.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          name: item.name as string,
          picUrl: item.picUrl as string,
          playCount: item.playCount as number | undefined,
          trackCount: item.trackCount as number | undefined,
          creator: item.creator as { nickname: string } | undefined,
        }));

        if (!controller.signal.aborted) {
          setPlaylists(items);
          setLoading(false);
          setDailyCache('recommend_playlists', items);
        }

        // 后台静默为前 4 个歌单补全歌曲预览
        fetchPlaylistsWithSongs(items.slice(0, 4)).then((enhanced) => {
          if (controller.signal.aborted) return;
          setPlaylists((prev) => {
            const map = new Map(enhanced.map((e) => [e.id, e]));
            const nextList = prev.map((p) => map.get(p.id) || p);
            setDailyCache('recommend_playlists', nextList);
            return nextList;
          });
        }).catch(() => {});
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('无法连接到网易云 API', err);
          setError('无法连接到网易云 API，请确认后端服务已启动');
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [authState]);

  useEffect(() => {
    if (authState !== 'authed') return;

    getDailyCache<DailySong[]>('daily_songs').then((cached) => {
      if (cached?.length) {
        setDailySongs(cached);
        return;
      }

      const fetchUserData = async () => {
        try {
          const res = await getDailyRecommend();
          if (res.data.data?.dailySongs) {
            setDailySongs(res.data.data.dailySongs);
            setDailyCache('daily_songs', res.data.data.dailySongs);
          }
        } catch {}
      };
      fetchUserData();
    });
  }, [authState]);

  const value = useMemo(() => ({
    playlists,
    dailySongs,
    currentSong,
    setCurrentSong,
    loading,
    error,
    refreshPlaylists,
  }), [playlists, dailySongs, currentSong, setCurrentSong, loading, error, refreshPlaylists]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
