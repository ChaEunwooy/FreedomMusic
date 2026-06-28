import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

      const items = list.map((item: Record<string, unknown>) => ({
        id: item.id as number,
        name: item.name as string,
        picUrl: (item.coverImgUrl || item.picUrl) as string,
        playCount: item.playCount as number | undefined,
        trackCount: item.trackCount as number | undefined,
        creator: item.creator as { nickname: string } | undefined,
      }));

      setPlaylists(items.map((i: (typeof items)[number]) => ({ ...i, songs: undefined })));

      const full = await fetchPlaylistsWithSongs(items);
      setPlaylists(full);
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

    getDailyCache<Playlist[]>('recommend_playlists').then((cached) => {
      if (controller.signal.aborted) return;
      if (cached?.length) {
        setPlaylists(cached);
        setLoading(false);
        return;
      }

      (async () => {
        try {
          setLoading(true);
          setError('');
          const res = await getRecommendPlaylists(10);
          const result = res.data.result;
          if (!result?.length) {
            setPlaylists([]);
            setLoading(false);
            return;
          }

          const items = result.map((item: Record<string, unknown>) => ({
            id: item.id as number,
            name: item.name as string,
            picUrl: item.picUrl as string,
            playCount: item.playCount as number | undefined,
            trackCount: item.trackCount as number | undefined,
            creator: item.creator as { nickname: string } | undefined,
          }));

          setPlaylists(items.map((i: (typeof items)[number]) => ({ ...i, songs: undefined })));
          setLoading(false);

          if (controller.signal.aborted) return;
          const full = await fetchPlaylistsWithSongs(items);
          if (!controller.signal.aborted) {
            setPlaylists(full);
            setDailyCache('recommend_playlists', full);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            console.error('无法连接到网易云 API', err);
            setError('无法连接到网易云 API，请确认后端服务已启动');
            setLoading(false);
          }
        }
      })();
    });

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
        } catch {
          // daily recommend unavailable
        }
      };
      fetchUserData();
    });
  }, [authState]);

  const value = {
    playlists, dailySongs, currentSong, setCurrentSong, loading, error, refreshPlaylists,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
