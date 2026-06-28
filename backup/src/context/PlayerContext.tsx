import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Song, DailySong } from './types';
import { useData } from './DataContext';
import { getSongUrl } from '../services/api';
import { setConfig, loadConfig } from '../services/config';

export type PlayMode = 'sequence' | 'shuffle' | 'repeat-one' | 'repeat-all';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlayerContextType {
  currentSong: Song | null;
  queue: DailySong[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;
  volume: number;
  playMode: PlayMode;
  playbackRate: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (song: Song) => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  setProgress: (p: number) => void;
  setQueue: (songs: DailySong[]) => void;
  insertNext: (song: DailySong) => void;
  cyclePlayMode: () => void;
  cyclePlaybackRate: () => void;
  setPlaybackRate: (rate: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
};

const PLAY_MODES: PlayMode[] = ['sequence', 'shuffle', 'repeat-one', 'repeat-all'];

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { currentSong, setCurrentSong, dailySongs } = useData();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [queue, _setQueue] = useState<DailySong[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<DailySong[]>([]);
  const queueIndexRef = useRef(-1);
  const historyRef = useRef<number[]>([]);
  const restoreDone = useRef(false);
  const nextLockRef = useRef(false);
  const prevLockRef = useRef(false);
  const playLockRef = useRef(false);

  const setQueue = useCallback((songs: DailySong[]) => {
    queueRef.current = songs;
    _setQueue(songs);
  }, []);

  const insertNext = useCallback((song: DailySong) => {
    const current = queueRef.current;
    const idx = queueIndexRef.current;
    const newQueue = [...current.slice(0, idx + 1), song, ...current.slice(idx + 1)];
    queueRef.current = newQueue;
    _setQueue(newQueue);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // 恢复播放状态
  useEffect(() => {
    if (restoreDone.current) return;
    restoreDone.current = true;
    loadConfig().then((res) => {
      const state = res.data?.player_state;
      if (!state) return;
      if (state.volume !== undefined) setVolume(state.volume);
      if (state.playMode) setPlayMode(state.playMode);
      if (state.playbackRate !== undefined) setPlaybackRate(state.playbackRate);
      if (state.queue) {
        setQueue(state.queue);
        const idx = state.queueIndex ?? -1;
        queueIndexRef.current = idx;
        setQueueIndex(idx);
      }
      if (state.currentSong) {
        setCurrentSong({ ...state.currentSong, url: undefined });
        if (state.progress !== undefined) setProgress(state.progress);
      }
    }).catch(() => {});
  }, [setCurrentSong]);

  // 保存播放状态
  useEffect(() => {
    const timer = setTimeout(() => {
      const state = {
        currentSong: currentSong ? { ...currentSong, url: undefined } : null,
        queue,
        queueIndex,
        progress,
        isPlaying,
        volume,
        playMode,
        playbackRate,
      };
      setConfig('player_state', state);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentSong, queue, queueIndex, progress, isPlaying, volume, playMode, playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong?.url) return;
    audio.src = currentSong.url;
    audio.load();
    const handleCanPlay = () => {
      audio.play().catch(() => {});
    };
    audio.addEventListener('canplay', handleCanPlay, { once: true });
    return () => audio.removeEventListener('canplay', handleCanPlay);
  }, [currentSong?.url]);

  useEffect(() => {
    if (dailySongs.length > 0 && queue.length === 0) {
      setQueue(dailySongs);
    }
  }, [dailySongs, queue.length]);

  const cyclePlayMode = useCallback(() => {
    setPlayMode(prev => {
      const idx = PLAY_MODES.indexOf(prev);
      return PLAY_MODES[(idx + 1) % PLAY_MODES.length];
    });
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRate(prev => {
      const idx = PLAYBACK_RATES.indexOf(prev);
      return PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    });
  }, []);

  const setVolumeStable = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const setProgressStable = useCallback((p: number) => {
    setProgress(p);
  }, []);

  const setPlaybackRateStable = useCallback((rate: number) => {
    setPlaybackRate(rate);
  }, []);

  const getRandomIndex = useCallback((max: number): number => {
    if (max <= 1) return 0;
    let idx: number;
    do {
      idx = Math.floor(Math.random() * max);
    } while (idx === queueIndexRef.current);
    return idx;
  }, []);

  const play = useCallback(async (song: Song) => {
    if (playLockRef.current) return;
    if (currentSong?.id === song.id && audioRef.current?.src) {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
      return;
    }

    playLockRef.current = true;
    let url = song.url;
    if (!url) {
      try {
        const res = await getSongUrl(song.id);
        url = res.data.data?.[0]?.url || undefined;
      } catch (err) {
        console.error('[Player] Failed to get song url:', err);
      }
    }

    if (!url) { playLockRef.current = false; return; }

    if (currentSong?.id !== song.id) {
      setProgress(0);
    }

    const currentQueue = queueRef.current;
    const idx = currentQueue.findIndex(q => q.id === song.id);
    if (idx < 0) {
      const newQueue = [...currentQueue, { ...song, url } as DailySong];
      setQueue(newQueue);
      queueIndexRef.current = newQueue.length - 1;
      setQueueIndex(queueIndexRef.current);
    } else {
      queueIndexRef.current = idx;
      setQueueIndex(idx);
    }

    historyRef.current.push(queueIndexRef.current);
    if (historyRef.current.length > 50) historyRef.current.shift();

    setCurrentSong({ ...song, url });
    setIsPlaying(true);
    playLockRef.current = false;
  }, [currentSong, setCurrentSong]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong && !currentSong.url) {
      try {
        const res = await getSongUrl(currentSong.id);
        const url = res.data.data?.[0]?.url;
        if (!url) {
          setIsPlaying(false);
          return;
        }
        setCurrentSong({ ...currentSong, url });
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentSong, setCurrentSong]);

  const next = useCallback(async () => {
    if (queue.length === 0 || nextLockRef.current) return;
    nextLockRef.current = true;

    const currentIdx = queueIndexRef.current;

    if (playMode === 'repeat-one') {
      const song = queue[currentIdx];
      if (!song) { nextLockRef.current = false; return; }
      let url = song.url;
      if (!url) {
        try {
          const res = await getSongUrl(song.id);
          url = res.data.data?.[0]?.url || undefined;
        } catch (err) {
          console.error('[Player] Failed to get song url:', err);
        }
      }
      if (!url) { nextLockRef.current = false; return; }
      setCurrentSong({ ...song, url });
      setIsPlaying(true);
      nextLockRef.current = false;
      return;
    }

    let nextIdx: number;
    if (playMode === 'shuffle') {
      nextIdx = getRandomIndex(queue.length);
    } else {
      nextIdx = currentIdx + 1;
      if (nextIdx >= queue.length) {
        if (playMode === 'repeat-all') {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          nextLockRef.current = false;
          return;
        }
      }
    }

    historyRef.current.push(currentIdx);
    queueIndexRef.current = nextIdx;
    setQueueIndex(nextIdx);
    const song = queue[nextIdx];
    if (!song) { nextLockRef.current = false; return; }

    let url = song.url;
    if (!url) {
      try {
        const res = await getSongUrl(song.id);
        url = res.data.data?.[0]?.url || undefined;
      } catch (err) {
        console.error('[Player] Failed to get song url:', err);
      }
    }

    if (url) {
      setCurrentSong({ ...song, url });
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
    nextLockRef.current = false;
  }, [queue, playMode, getRandomIndex, setCurrentSong]);

  const prev = useCallback(async () => {
    if (queue.length === 0 || prevLockRef.current) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    prevLockRef.current = true;

    if (historyRef.current.length > 0) {
      const prevIdx = historyRef.current.pop()!;
      if (prevIdx < 0 || prevIdx >= queue.length) { prevLockRef.current = false; return; }
      queueIndexRef.current = prevIdx;
      setQueueIndex(prevIdx);
      const song = queue[prevIdx];
      if (!song) { prevLockRef.current = false; return; }
      let url = song.url;
      if (!url) {
        try {
          const res = await getSongUrl(song.id);
          url = res.data.data?.[0]?.url || undefined;
        } catch (err) {
          console.error('[Player] Failed to get song url:', err);
        }
      }
      setCurrentSong({ ...song, url });
      setIsPlaying(true);
      prevLockRef.current = false;
      return;
    }

    let prevIdx: number;
    if (playMode === 'shuffle') {
      prevIdx = getRandomIndex(queue.length);
    } else {
      prevIdx = queueIndexRef.current - 1;
      if (prevIdx < 0) {
        prevIdx = playMode === 'repeat-all' ? queue.length - 1 : 0;
      }
    }

    queueIndexRef.current = prevIdx;
    setQueueIndex(prevIdx);
    const song = queue[prevIdx];
    if (!song) { prevLockRef.current = false; return; }
    let url = song.url;
    if (!url) {
      try {
        const res = await getSongUrl(song.id);
        url = res.data.data?.[0]?.url || undefined;
      } catch (err) {
        console.error('[Player] Failed to get song url:', err);
      }
    }
    setCurrentSong({ ...song, url });
    setIsPlaying(true);
    prevLockRef.current = false;
  }, [queue, playMode, getRandomIndex, setCurrentSong]);

  const value = useMemo(() => ({
    currentSong, queue, queueIndex, isPlaying, progress, volume, playMode, playbackRate, audioRef,
    play, pause, next, prev, togglePlay, setVolume: setVolumeStable, setProgress: setProgressStable, setQueue, insertNext, cyclePlayMode, cyclePlaybackRate, setPlaybackRate: setPlaybackRateStable,
  }), [currentSong, queue, queueIndex, isPlaying, progress, volume, playMode, playbackRate, play, pause, next, prev, togglePlay, setVolumeStable, setProgressStable, setQueue, insertNext, cyclePlayMode, cyclePlaybackRate, setPlaybackRateStable]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
