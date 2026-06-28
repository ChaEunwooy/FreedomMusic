import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faListUl } from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../context/DataContext';
import { usePlayer } from '../../context/PlayerContext';
import { getLyric, getSongUrl } from '../../services/api';
import { parseLyric, type LyricLine } from '../../utils/format';
import LikeButton from '../../components/LikeButton';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import PlaylistItem from './PlaylistItem';

export interface OriginRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FullscreenPlayerProps {
  open: boolean;
  origin: OriginRect | null;
  onClose: () => void;
}

const FullscreenPlayer: FC<FullscreenPlayerProps> = ({ open, origin, onClose }) => {
  const { currentSong } = useData();
  const { progress, audioRef, isPlaying, play, queue, queueIndex } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<'hidden' | 'expand' | 'full'>('hidden');
  const [opening, setOpening] = useState(true);
  const lyricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && origin) {
      setOpening(true);
      setPhase('expand');
      const t1 = setTimeout(() => setPhase('full'), 50);
      return () => clearTimeout(t1);
    } else if (!open && phase !== 'hidden') {
      setOpening(false);
      setPhase('expand');
      const t = setTimeout(() => setPhase('hidden'), 500);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!currentSong) return;
    setLyrics([]);
    setActiveIndex(0);
    getLyric(currentSong.id).then((res) => {
      setLyrics(parseLyric(res.data.lrc?.lyric || ''));
    }).catch(() => {});
  }, [currentSong?.id]);

  useEffect(() => {
    if (lyrics.length === 0 || !audioRef.current) return;
    const ct = audioRef.current.currentTime;
    let idx = 0;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (ct >= lyrics[i].time) { idx = i; break; }
    }
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      const el = lyricRef.current?.children[idx] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [progress, lyrics, activeIndex, audioRef]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (phase === 'hidden' || !currentSong || !origin) return null;

  const isFull = phase === 'full';

  const style: React.CSSProperties = isFull
    ? { left: 0, top: 0, width: '100vw', height: '100vh', borderRadius: 0 }
    : {
        left: origin.x,
        top: origin.y,
        width: origin.w,
        height: origin.h,
        borderRadius: 24,
      };

  const playSong = async (song: { id: number; name: string; ar: { name: string }[]; al: { picUrl: string } }) => {
    try {
      const res = await getSongUrl(song.id);
      const url = res.data.data?.[0]?.url;
      if (url) play({ ...song, url });
    } catch {
      // song url unavailable
    }
  };

  return (
    <div
      className={`fixed z-50 overflow-hidden transition-all duration-[500ms] ${
        opening
          ? 'ease-[cubic-bezier(0.4,0,1,1)]'
          : 'ease-[cubic-bezier(0,0,0.2,1)]'
      }`}
      style={style}
    >
      {/* 多层背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#151d35] to-[#0d1225]" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={currentSong.al.picUrl + '?param=800y800'}
          className="absolute w-[130%] h-[130%] object-cover -translate-x-[15%] -translate-y-[15%] blur-[120px] opacity-20"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* 内容 */}
      <div
        className={`relative h-full flex flex-col transition-opacity duration-300 ${
          isFull ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-10 py-5 shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-lg" />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-[9px] text-white/25 uppercase tracking-[0.3em] mb-0.5">正在播放</p>
            <p className="text-[10px] text-white/40">{currentSong.ar?.[0]?.name}</p>
          </div>
          <div className="w-10" />
        </div>

        {/* 主内容 */}
        <div className="flex-1 flex items-center gap-10 px-14 min-h-0 overflow-hidden">
          {/* 封面 */}
          <div className={`${queue.length > 0 ? 'basis-[25%]' : 'basis-[33%]'} shrink-0 h-full flex flex-col items-center justify-center transition-all duration-300`} >
            <div className="relative" style={{ marginLeft: '20%' }}>
              <div
                className="absolute -inset-6 rounded-[40px] opacity-40 blur-2xl transition-opacity duration-700"
                style={{
                  backgroundImage: `url(${currentSong.al.picUrl}?param=200y200)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px)',
                }}
              />
              <div className="relative w-[220px] h-[220px] rounded-[28px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)] border border-white/10">
                <img
                  src={currentSong.al.picUrl + '?param=600y600'}
                  className={`w-full h-full object-cover transition-transform duration-[20000ms] ease-linear ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />
              </div>
            </div>
            <div className="mt-5 text-center" style={{marginLeft: '20%'} }>
              <h2 className="text-xl font-extrabold text-white mb-2 tracking-tight">{currentSong.name}</h2>
              <div className="flex items-center justify-center gap-3">
                <p className="text-sm text-white/40 font-medium">{currentSong.ar?.[0]?.name ?? '未知艺术家'}</p>
                <span className="text-white/15">·</span>
                <LikeButton songId={currentSong.id} size="sm" />
              </div>
            </div>
          </div>

          {/* 歌词 */}
          <div className={`${queue.length > 0 ? 'basis-[50%]' : 'basis-[67%]'} shrink-0 h-full transition-all duration-300`}>
            <div ref={lyricRef} className="w-full h-full overflow-y-auto no-scrollbar text-center flex flex-col" style={{marginLeft: '-5%', marginTop: '-5%'}}>
              <div className="flex-1 flex-shrink-0" />
              {lyrics.length > 0 ? (
                lyrics.map((line, i) => {
                  const isActive = i === activeIndex;
                  const isNear = Math.abs(i - activeIndex) <= 2;
                  return (
                    <div
                      key={i}
                      className={`py-2.5 px-4 transition-all duration-500 cursor-pointer rounded-xl ${
                        isActive
                          ? 'text-white text-lg font-bold bg-white/5'
                          : isNear
                            ? 'text-white/30 text-sm hover:text-white/50'
                            : 'text-white/15 text-[13px]'
                      }`}
                    >
                      {line.text}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/15">
                  <p className="text-lg mb-2">♪</p>
                  <p className="text-sm">暂无歌词</p>
                </div>
              )}
              <div className="flex-1 flex-shrink-0" />
            </div>
          </div>

          {/* 待播放歌曲 */}
          {queue.length > 0 && (
            <div className="basis-[25%] shrink-0 flex flex-col h-full overflow-hidden">
              <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                <FontAwesomeIcon icon={faListUl} className="text-white/25 text-xs" />
                <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">待播放</span>
                <span className="text-[10px] text-white/20 ml-auto">{Math.max(0, queue.length - queueIndex - 1)} 首</span>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 overflow-x-hidden">
                {currentSong && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 max-w-full overflow-hidden mb-2">
                    <img
                      src={currentSong.al.picUrl + '?param=80y80'}
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[11px] font-bold text-white truncate">{currentSong.name}</p>
                      <p className="text-[10px] text-white/40 truncate">{currentSong.ar?.[0]?.name}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
                  </div>
                )}
                {queue.slice(queueIndex + 1).map((song) => (
                  <PlaylistItem
                    key={song.id}
                    song={{
                      id: song.id,
                      name: song.name,
                      artist: song.ar[0]?.name ?? '未知',
                      cover: song.al.picUrl,
                    }}
                    onClick={() => playSong(song)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部控制 */}
        <div className="shrink-0 px-16 pb-8 pt-2">
          <ProgressBar />
          <div className="relative flex items-center mt-8">
            <div className="absolute left-1/2 -translate-x-1/2">
              <PlayerControls variant="fullscreen" />
            </div>
            <div className="ml-auto">
              <VolumeControl />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
