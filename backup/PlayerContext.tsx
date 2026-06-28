import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Song, DailySong } from './types';
import { useData } from './DataContext';
import { getSongUrl } from '../services/api';
import { setConfig, loadConfig } from '../services/config';

// ── URL 缓存 ──
const urlCache = new Map<number, string>();

function getCachedUrl(id: number) { return urlCache.get(id); }
function setCachedUrl(id: number, url: string) { urlCache.set(id, url); }

// ── Audio 预加载池 ──
const PRELOAD_COUNT = 5;
const audioPool = new Map<number, HTMLAudioElement>();
let preloadAbortId = 0;

function createPreloadedAudio(url: string, id: number): HTMLAudioElement {
  const existing = audioPool.get(id);
  if (existing) return existing;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  audio.load();
  audioPool.set(id, audio);
  return audio;
}

function getPreloadedAudio(id: number): HTMLAudioElement | undefined {
  return audioPool.get(id);
}

function evictOldPreloads(currentId: number, keepIds: number[]) {
  const keep = new Set(keepIds);
  for (const [id, audio] of audioPool) {
    if (!keep.has(id) && id !== currentId) {
      audio.pause();
      audio.src = '';
      audioPool.delete(id);
    }
  }
}

async function ensureUrl(song: { id: number; url?: string }): Promise<string | undefined> {
  if (song.url) return song.url;
  const cached = getCachedUrl(song.id);
  if (cached) return cached;
  try {
    const res = await getSongUrl(song.id);
    const url = res.data.data?.[0]?.url || undefined;
    if (url) setCachedUrl(song.id, url);
    return url;
  } catch {
    return undefined;
  }
}

async function batchFetchUrls(ids: number[]) {
  const toFetch = ids.filter(id => !urlCache.has(id));
  if (!toFetch.length) return;
  try {
    const res = await fetch(`/api/song/url?id=${toFetch.join(',')}`);
    const data = await res.json();
    for (const item of (data.data || [])) {
      if (item.url && item.id) setCachedUrl(item.id, item.url);
    }
  } catch {}
}

// 预加载下一首歌曲的音频数据
function preloadNextAudio(queue: DailySong[], index: number, currentId: number) {
  const abortId = ++preloadAbortId;
  const idsToPreload: number[] = [];

  for (let i = 1; i <= PRELOAD_COUNT; i++) {
    const nextIdx = (index + i) % queue.length;
    if (nextIdx === index && queue.length > 1) continue;
    idsToPreload.push(queue[nextIdx].id);
  }

  // 先批量拿 URL
  batchFetchUrls(idsToPreload).then(() => {
    if (abortId !== preloadAbortId) return;
    // 再预加载音频数据（只预加载最近 2 首）
    for (let i = 1; i <= Math.min(2, queue.length - 1); i++) {
      if (abortId !== preloadAbortId) break;
      const nextIdx = (index + i) % queue.length;
      if (nextIdx === index) continue;
      const song = queue[nextIdx];
      const url = getCachedUrl(song.id);
      if (url) createPreloadedAudio(url, song.id);
    }
  });

  // 清理不再需要的预加载
  const keepIds = idsToPreload.slice(0, PRELOAD_COUNT);
  evictOldPreloads(currentId, keepIds);
}

export type PlayMode = 'sequence' | 'shuffle' | 'repeat-one' | 'repeat-all';
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PLAY_MODES: PlayMode[] = ['sequence', 'shuffle', 'repeat-one', 'repeat-all'];

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
  sleepTimer: number;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
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

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { currentSong, setCurrentSong, dailySongs } = useData();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [queue, _setQueue] = useState<DailySong[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [sleepTimer, setSleepTimerState] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<DailySong[]>([]);
  const queueIndexRef = useRef(-1);
  const historyRef = useRef<number[]>([]);
  const restoreDone = useRef(false);
  const nextLockRef = useRef(false);
  const prevLockRef = useRef(false);
  const playLockRef = useRef(false);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playOnAudio = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = url;
    audio.load();
    audio.play().catch(() => {});
  }, []);

  const setSleepTimerStable = useCallback((minutes: number) => {
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    const seconds = minutes * 60;
    setSleepTimerState(seconds);
    sleepTimerRef.current = setInterval(() => {
      setSleepTimerState((prev) => {
        if (prev <= 1) {
          clearInterval(sleepTimerRef.current!);
          sleepTimerRef.current = null;
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [audioRef]);

  const clearSleepTimerStable = useCallback(() => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerState(0);
  }, []);

  useEffect(() => {
    const handler = () => clearSleepTimerStable();
    document.addEventListener('sleep-timer-done', handler);
    return () => document.removeEventListener('sleep-timer-done', handler);
  }, [clearSleepTimerStable]);

  const setQueue = useCallback((songs: DailySong[]) => {
    queueRef.current = songs;
    _setQueue(songs);
    // 批量拿 URL
    batchFetchUrls(songs.map(s => s.id)).then(() => {
      // 预加载下一首音频
      const idx = queueIndexRef.current;
      if (idx >= 0 && idx < songs.length) {
        preloadNextAudio(songs, idx, songs[idx].id);
      }
    });
  }, []);

  const insertNext = useCallback((song: DailySong) => {
    const current = queueRef.current;
    const idx = queueIndexRef.current;
    const newQueue = [...current.slice(0, idx + 1), song, ...current.slice(idx + 1)];
    queueRef.current = newQueue;
    _setQueue(newQueue);
    ensureUrl(song).then(url => {
      if (url) createPreloadedAudio(url, song.id);
    });
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

  const setVolumeStable = useCallback((v: number) => setVolume(v), []);
  const setProgressStable = useCallback((p: number) => setProgress(p), []);
  const setPlaybackRateStable = useCallback((rate: number) => setPlaybackRate(rate), []);

  const getRandomIndex = useCallback((max: number): number => {
    if (max <= 1) return 0;
    let idx: number;
    do { idx = Math.floor(Math.random() * max); } while (idx === queueIndexRef.current);
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
    let url = getCachedUrl(song.id) || song.url;
    if (!url) url = await ensureUrl(song);
    if (!url) { playLockRef.current = false; return; }

    const currentQueue = queueRef.current;
    const idx = currentQueue.findIndex(q => q.id === song.id);
    let targetIdx = idx;
    if (idx < 0) {
      const newQueue = [...currentQueue, { ...song, url } as DailySong];
      setQueue(newQueue);
      targetIdx = newQueue.length - 1;
      queueIndexRef.current = targetIdx;
      setQueueIndex(targetIdx);
    } else {
      queueIndexRef.current = idx;
      setQueueIndex(idx);
    }

    if (currentSong?.id !== song.id) setProgress(0);

    playOnAudio(url);

    historyRef.current.push(queueIndexRef.current);
    if (historyRef.current.length > 50) historyRef.current.shift();

    setCurrentSong({ ...song, url });
    setIsPlaying(true);
    playLockRef.current = false;

    // 切歌后预加载下一首
    const currentQ = queueRef.current;
    preloadNextAudio(currentQ, queueIndexRef.current, song.id);
  }, [currentSong, setCurrentSong, setQueue, playOnAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong && !currentSong.url) {
      const url = getCachedUrl(currentSong.id) || await ensureUrl(currentSong);
      if (!url) { setIsPlaying(false); return; }
      setCurrentSong({ ...currentSong, url });
      setIsPlaying(true);
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
      let url = getCachedUrl(song.id) || song.url;
      if (!url) url = await ensureUrl(song);
      if (!url) { nextLockRef.current = false; return; }

      playOnAudio(url);
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

    let url = getCachedUrl(song.id) || song.url;
    if (!url) url = await ensureUrl(song);

    if (url) {
      playOnAudio(url);
      setCurrentSong({ ...song, url });
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
    nextLockRef.current = false;

    preloadNextAudio(queue, nextIdx, song.id);
  }, [queue, playMode, getRandomIndex, setCurrentSong, playOnAudio]);

  const prev = useCallback(async () => {
    if (queue.length === 0 || prevLockRef.current) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    prevLockRef.current = true;

    let targetIdx: number;
    if (historyRef.current.length > 0) {
      targetIdx = historyRef.current.pop()!;
      if (targetIdx < 0 || targetIdx >= queue.length) { prevLockRef.current = false; return; }
    } else if (playMode === 'shuffle') {
      targetIdx = getRandomIndex(queue.length);
    } else {
      targetIdx = queueIndexRef.current - 1;
      if (targetIdx < 0) {
        targetIdx = playMode === 'repeat-all' ? queue.length - 1 : 0;
      }
    }

    queueIndexRef.current = targetIdx;
    setQueueIndex(targetIdx);
    const song = queue[targetIdx];
    if (!song) { prevLockRef.current = false; return; }

    let url = getCachedUrl(song.id) || song.url;
    if (!url) url = await ensureUrl(song);

    if (url) {
      playOnAudio(url);
      setCurrentSong({ ...song, url });
      setIsPlaying(true);
    }
    prevLockRef.current = false;

    preloadNextAudio(queue, targetIdx, song.id);
  }, [queue, playMode, getRandomIndex, setCurrentSong, playOnAudio]);

  const value = useMemo(() => ({
    currentSong, queue, queueIndex, isPlaying, progress, volume, playMode, playbackRate, audioRef,
    sleepTimer, setSleepTimer: setSleepTimerStable, clearSleepTimer: clearSleepTimerStable,
    play, pause, next, prev, togglePlay, setVolume: setVolumeStable, setProgress: setProgressStable, setQueue, insertNext, cyclePlayMode, cyclePlaybackRate, setPlaybackRate: setPlaybackRateStable,
  }), [currentSong, queue, queueIndex, isPlaying, progress, volume, playMode, playbackRate, sleepTimer, setSleepTimerStable, clearSleepTimerStable, play, pause, next, prev, togglePlay, setVolumeStable, setProgressStable, setQueue, insertNext, cyclePlayMode, cyclePlaybackRate, setPlaybackRateStable]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
