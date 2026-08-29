import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faListUl, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../context/DataContext';
import { usePlayer } from '../../context/PlayerContext';
import { useI18n } from '../../i18n';
import { getLyric, getSongUrl } from '../../services/api';
import { parseLyric, type LyricLine } from '../../utils/format';
import LikeButton from '../../components/LikeButton';
import PlayerControls from './PlayerControls';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';

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

// ── 动画时长与阻尼曲线配置（可在此自由调节延展速度）──
const EXPAND_DURATION = 700; // 展开与收起时长 (毫秒 ms，700ms 沉稳优雅且延展细节丰富)
const MORPH_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'; // 苹果 iOS 原生弹性减速阻尼曲线

const FullscreenPlayer: FC<FullscreenPlayerProps> = ({ open, origin, onClose }) => {
  const { currentSong } = useData();
  const { progress, audioRef, isPlaying, play, queue, queueIndex } = usePlayer();
  const { t } = useI18n();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [playingIndex, setPlayingIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [phase, setPhase] = useState<'hidden' | 'animating' | 'full'>('hidden');
  const lyricRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const playingIndexRef = useRef(0);

  const playSong = async (song: { id: number; name: string; ar: { name: string }[]; al: { picUrl: string } }) => {
    try {
      const res = await getSongUrl(song.id);
      const url = res.data.data?.[0]?.url;
      if (url) play({ ...song, url });
    } catch {}
  };

  const handleLyricClick = (time: number, index: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    isUserScrollingRef.current = false;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setPlayingIndex(index);
    setFocusIndex(index);
    playingIndexRef.current = index;
    const el = lyricRef.current?.children[index] as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── 用户鼠标滚轮滚动歌词时，实时计算距离中心最近的行并切换高亮与弧顶 ──
  const handleLyricScroll = () => {
    if (!lyricRef.current || lyrics.length === 0) return;
    isUserScrollingRef.current = true;

    const container = lyricRef.current;
    const centerY = container.scrollTop + container.clientHeight / 2;
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      const childCenterY = child.offsetTop + child.offsetHeight / 2;
      const diff = Math.abs(childCenterY - centerY);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    setFocusIndex(closestIdx);

    // 停止滚动 2.8 秒后，平滑恢复播放同步
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
      setFocusIndex(playingIndexRef.current);
      const el = lyricRef.current?.children[playingIndexRef.current] as HTMLElement;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 2800);
  };

  useEffect(() => {
    if (open && origin) {
      setPhase('animating');
      animFrameRef.current = requestAnimationFrame(() => {
        animFrameRef.current = requestAnimationFrame(() => {
          setPhase('full');
        });
      });
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else if (!open && phase !== 'hidden') {
      setPhase('animating');
      const t = setTimeout(() => {
        setPhase('hidden');
      }, EXPAND_DURATION);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!currentSong) return;
    setLyrics([]);
    setPlayingIndex(0);
    setFocusIndex(0);
    playingIndexRef.current = 0;
    isUserScrollingRef.current = false;
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
    playingIndexRef.current = idx;
    if (idx !== playingIndex) {
      setPlayingIndex(idx);
      // 若用户当前没有在滚轮浏览，则自动跟随高亮并居中
      if (!isUserScrollingRef.current) {
        setFocusIndex(idx);
        const el = lyricRef.current?.children[idx] as HTMLElement;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [progress, lyrics, playingIndex, audioRef]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (phase === 'hidden' || !currentSong || !origin) return null;

  const isFull = phase === 'full';
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // ── 精确计算卡片物理位置裁剪框（保持原有卡片 28px 圆角与位置，绝不拉伸变形）──
  const top = origin.y;
  const left = origin.x;
  const right = Math.max(0, vw - (origin.x + origin.w));
  const bottom = Math.max(0, vh - (origin.y + origin.h));

  const clipPathStyle = isFull
    ? 'inset(0px 0px 0px 0px round 0px)'
    : `inset(${top}px ${right}px ${bottom}px ${left}px round 28px)`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none"
      style={{
        clipPath: clipPathStyle,
        transition: `clip-path ${EXPAND_DURATION}ms ${MORPH_EASING}, opacity 300ms ease`,
        willChange: 'clip-path',
      }}
    >
      {/* ── 1. 完美适配当前软件主题的极光流光背景 (Theme-Adaptive Ambient Fluid Mesh) ── */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: 'linear-gradient(135deg, var(--theme-bg-from, #080b12) 0%, var(--theme-bg-via, #10192e) 50%, var(--theme-bg-to, #080b12) 100%)',
        }}
      />
      
      {/* 动态大光斑 1: 软件当前主题强调色呼吸弥散 */}
      <div
        className="absolute w-[50vw] h-[50vw] -top-[10%] -left-[10%] rounded-full opacity-35 blur-[140px] pointer-events-none transition-all duration-1000"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--theme-accent, #38bdf8) 0%, transparent 70%)',
        }}
      />

      {/* 动态大光斑 2: 封面原色与超大深度模糊 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <img
          src={currentSong.al.picUrl + '?param=600y600'}
          className="absolute w-[140%] h-[140%] object-cover -translate-x-[20%] -translate-y-[20%] blur-[120px] scale-110"
          style={{ transform: 'translate3d(0,0,0)' }}
        />
      </div>

      {/* 动态大光斑 3: 右侧微光环境色 */}
      <div
        className="absolute w-[40vw] h-[40vw] -bottom-[10%] -right-[10%] rounded-full opacity-25 blur-[130px] pointer-events-none transition-all duration-1000"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--theme-accent, #6366f1) 0%, transparent 70%)',
        }}
      />

      {/* 电影级暗角与渐变质感遮罩 */}
      <div className="absolute inset-0 bg-radial-gradient from-black/10 via-black/50 to-black/85 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* ── 2. 主体内容层 ── */}
      <div className="relative h-full flex flex-col justify-between p-6 md:p-10">
        {/* 顶部导航与状态栏 */}
        <div className="flex items-center justify-between shrink-0 mb-4 z-20 max-w-[1440px] w-full mx-auto">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition-all shadow-lg backdrop-blur-md cursor-pointer"
            title={t('close')}
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
          </button>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--theme-accent,#22d3ee)] animate-pulse" />
            <span className="text-[11px] font-semibold text-white/80 tracking-widest uppercase">{t('player.now_playing')}</span>
          </div>

          <div className="w-10" />
        </div>

        {/* ── 核心三栏全景展示区 (左: 黑胶球体 | 中: 环抱半弧歌词 | 右: 直接平铺待播列表) ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center min-h-0 overflow-hidden my-auto max-w-[1440px] w-full mx-auto px-4">
          
          {/* ── 1. 左栏：精巧黑胶球体核心 (占 3 列，约 25%) ── */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center h-full max-h-[560px] z-10">
            {/* 球体外发光与本体 */}
            <div className="relative group shrink-0">
              {/* 球体背后柔光星云光晕 */}
              <div
                className="absolute -inset-6 rounded-full opacity-60 blur-3xl transition-opacity duration-1000 group-hover:opacity-85"
                style={{
                  backgroundImage: `url(${currentSong.al.picUrl}?param=200y200)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              
              {/* 精致球体/黑胶圆盘卡片 (210px 紧凑尺寸) */}
              <div className="relative w-[190px] h-[190px] sm:w-[220px] sm:h-[220px] rounded-full overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.15)] bg-black/60 backdrop-blur-md flex items-center justify-center">
                {/* 旋转黑胶封面 */}
                <img
                  src={currentSong.al.picUrl + '?param=600y600'}
                  className={`w-full h-full object-cover transition-transform duration-[20000ms] ease-linear ${
                    isPlaying ? 'scale-105 rotate-[360deg]' : 'scale-100'
                  }`}
                  style={{ transitionProperty: 'transform' }}
                  alt={currentSong.name}
                />

                {/* 黑胶唱片反光同心圆与中心金属微孔 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25)_0%,transparent_50%),radial-gradient(circle_at_70%_70%,rgba(0,0,0,0.6)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute w-7 h-7 rounded-full bg-[#080b12] border-2 border-white/20 shadow-inner flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-[var(--theme-accent,#22d3ee)] animate-pulse" />
                </div>
              </div>
            </div>

            {/* 歌曲标题与歌手 (紧凑居中展示在球体正下方) */}
            <div className="mt-5 text-center max-w-[240px]">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate drop-shadow-md">
                  {currentSong.name}
                </h1>
                <LikeButton songId={currentSong.id} size="sm" />
              </div>

              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-white/60 font-medium truncate">
                  {currentSong.ar?.[0]?.name ?? t('unknown_artist')}
                </p>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[var(--theme-accent,#22d3ee)]/15 text-[var(--theme-accent,#22d3ee)] border border-[var(--theme-accent,#22d3ee)]/25">
                  Hi-Res
                </span>
              </div>
            </div>
          </div>

          {/* ── 2. 中栏：半弧环抱巨幕歌词 (占 6 列，约 50%，支持滚轮高亮与弧顶实时联动) ── */}
          <div className="lg:col-span-6 h-full max-h-[560px] flex flex-col relative overflow-hidden min-w-0">
            <div
              ref={lyricRef}
              onScroll={handleLyricScroll}
              className="w-full h-full overflow-y-auto no-scrollbar py-[26vh] px-4 space-y-6 transition-all"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              }}
            >
              {lyrics.length > 0 ? (
                lyrics.map((line, i) => {
                  const isActive = i === focusIndex;
                  const distance = Math.abs(i - focusIndex);

                  // ── 半弧环抱数学模型：当前歌词在弧顶最远点（向右突出 48px），上下向左收拢贴近球体 ──
                  const MAX_ARC_OFFSET = 48;
                  const ARC_RANGE = 5;
                  const arcOffsetX = isActive
                    ? MAX_ARC_OFFSET
                    : distance < ARC_RANGE
                      ? Math.round(MAX_ARC_OFFSET * Math.cos((distance / ARC_RANGE) * (Math.PI / 2)))
                      : 0;

                  const scale = isActive ? 1.08 : Math.max(0.92, 1 - distance * 0.02);

                  return (
                    <div
                      key={i}
                      onClick={() => handleLyricClick(line.time, i)}
                      style={{
                        transform: `translate3d(${arcOffsetX}px, 0px, 0px) scale(${scale})`,
                        transformOrigin: 'left center',
                        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, color 0.3s ease',
                      }}
                      className={`cursor-pointer text-left select-none will-change-transform flex items-center group ${
                        isActive
                          ? 'text-white text-2xl sm:text-3xl lg:text-4xl font-black drop-shadow-[0_4px_24px_rgba(255,255,255,0.5)] opacity-100'
                          : distance === 1
                            ? 'text-white/50 text-xl sm:text-2xl font-bold hover:text-white/80 opacity-75'
                            : distance === 2
                              ? 'text-white/30 text-lg sm:text-xl font-medium hover:text-white/60 opacity-50'
                              : distance === 3
                                ? 'text-white/20 text-base sm:text-lg font-normal hover:text-white/40 opacity-35'
                                : 'text-white/10 text-sm sm:text-base font-normal hover:text-white/30 opacity-20'
                      }`}
                    >
                      {/* 弧顶发光脉冲指示条 */}
                      {isActive && (
                        <span className="inline-block w-1.5 h-6 rounded-full bg-gradient-to-b from-[var(--theme-accent,#22d3ee)] to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.8)] mr-3 shrink-0 animate-pulse" />
                      )}
                      <span className="leading-snug tracking-tight">{line.text}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/25">
                  <p className="text-3xl mb-3">♫</p>
                  <p className="text-base font-medium">{t('player.no_lyrics')}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. 右栏：直接平铺展示待播放歌曲 (占 3 列，无边框纯净流，点击直接切歌) ── */}
          <div className="lg:col-span-3 h-full max-h-[560px] flex flex-col min-w-0 pr-2">
            {/* 极简标题区 */}
            <div className="flex items-center justify-between pb-3 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListUl} className="text-[var(--theme-accent,#22d3ee)] text-xs" />
                <span className="text-xs font-bold text-white/80 tracking-wide uppercase">{t('player.up_next')}</span>
              </div>
              {queue.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
                  {Math.max(0, queue.length - queueIndex - 1)} {t('songs')}
                </span>
              )}
            </div>

            {/* 歌曲列表滚动区 (无厚重外壳，自然融入极光背景) */}
            <div
              className="flex-1 overflow-y-auto no-scrollbar space-y-1.5"
              style={{
                maskImage: 'linear-gradient(to bottom, black 0%, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 90%, transparent 100%)',
              }}
            >
              {queue.slice(queueIndex + 1).map((song) => (
                <div
                  key={song.id}
                  onClick={() => playSong(song)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 active:scale-[0.98] cursor-pointer transition-all duration-200 group"
                >
                  <img
                    src={song.al.picUrl ? song.al.picUrl + '?param=80y80' : ''}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 shadow-sm group-hover:border-[var(--theme-accent,#22d3ee)]/40 transition-colors"
                    alt={song.name}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white/90 group-hover:text-white truncate transition-colors">
                      {song.name}
                    </p>
                    <p className="text-[10px] text-white/40 group-hover:text-white/60 truncate transition-colors">
                      {song.ar?.[0]?.name ?? t('unknown')}
                    </p>
                  </div>
                  <FontAwesomeIcon
                    icon={faPlay}
                    className="text-white/20 text-xs opacity-0 group-hover:opacity-100 group-hover:text-[var(--theme-accent,#22d3ee)] transition-all mr-1 shrink-0"
                  />
                </div>
              ))}

              {queue.length <= queueIndex + 1 && (
                <div className="flex flex-col items-center justify-center py-16 text-white/20 text-xs">
                  <p className="text-xl mb-1.5 opacity-30">♪</p>
                  <p>{t('player.no_more_songs')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 底部控制台：黄金宽度进度条与播放控制器 ── */}
        <div className="w-full max-w-4xl mx-auto shrink-0 pt-2 z-20">
          <ProgressBar />

          <div className="relative flex items-center justify-between mt-3 px-2">
            <div className="w-28 sm:w-32" />

            <div className="absolute left-1/2 -translate-x-1/2">
              <PlayerControls variant="fullscreen" />
            </div>

            <div className="ml-auto flex items-center">
              <VolumeControl className="w-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
