import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useMood } from '../../context/MoodContext';
import { getTopPlaylist, getSongUrl, getPlaylistTrackAll } from '../../services/api';
import { loadConfig, setConfig } from '../../services/config';
import { MOOD_CONFIGS, getTodaysPhrase, getTodaysTag, type Mood } from './moodData';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';
import { useI18n } from '../../i18n';

const MOODS: Mood[] = ['happy', 'calm', 'sad'];

interface CachedMoodPlaylist {
  playlistId: number;
  tracks: any[];
}

const Banner: FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isPlaying, togglePlay, setQueue, play } = usePlayer();
  const { mood: selectedMood, setMood, followTheme, playingMood, setPlayingMood } = useMood();
  const [phrase, setPhrase] = useState('');
  const [animating, setAnimating] = useState(false);

  const moodDataRef = useRef<Record<Mood, CachedMoodPlaylist | null>>({
    happy: null,
    calm: null,
    sad: null,
  });
  const cacheLoadedRef = useRef(false);

  const RADIUS = 34;
  const BLADE_SIZE = 40;
  const ANGLES = [210, 330, 90];
  const CENTER = 50;

  const bladePositions = ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: CENTER + RADIUS * Math.cos(rad) - BLADE_SIZE / 2,
      y: CENTER + RADIUS * Math.sin(rad) - BLADE_SIZE / 2,
    };
  });

  const angleRef = useRef(0);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [enableTransition, setEnableTransition] = useState(false);
  const themeApplied = useRef(false);

  useEffect(() => {
    loadConfig().then((res) => {
      const cfg = res.data || {};
      const savedAngle = Number(cfg.mood_angle) || 0;
      // 规范化角度在 0~360 范围内，彻底杜绝历史累加成上千度的大数值
      const normalizedAngle = ((savedAngle % 360) + 360) % 360;
      angleRef.current = normalizedAngle;
      setRotateAngle(normalizedAngle);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedMood && followTheme && !themeApplied.current) {
      themeApplied.current = true;
      const theme = MOOD_CONFIGS[selectedMood].theme;
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [selectedMood, followTheme]);

  useEffect(() => {
    MOODS.forEach((mood) => {
      MOOD_CONFIGS[mood].bgImages.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    });
    Promise.all(
      MOODS.map(async (mood) => {
        const cached = await getDailyCache<CachedMoodPlaylist>(`mood_${mood}`);
        if (cached) {
          moodDataRef.current[mood] = cached;
        }
      })
    ).then(() => {
      cacheLoadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (selectedMood) {
      setPhrase(getTodaysPhrase(selectedMood));
    } else {
      setPhrase(t('banner.daily_journey'));
    }
  }, [selectedMood]);

  const getCurrentPositions = () => {
    return ANGLES.map((deg, i) => {
      const currentDeg = deg + rotateAngle;
      const rad = (currentDeg * Math.PI) / 180;
      const cx = CENTER + RADIUS * Math.cos(rad);
      const cy = CENTER + RADIUS * Math.sin(rad);
      const isLeft = cx < CENTER - 5;
      const isRight = cx > CENTER + 5;
      const isBottom = cy > CENTER + 5;
      return { cx, cy, isLeft, isRight, isBottom, mood: MOODS[i] };
    });
  };

  const handleMoodClick = (mood: Mood, index: number) => {
    if (animating) return;
    setEnableTransition(true); // 只有用户主动点击时才开启丝滑旋转过渡动画
    const current = getCurrentPositions()[index];
    const delta = current.isLeft ? -120 : 120;
    // 保持连续单向数值累加/累减，彻底消除从 0° 突变到 240° 导致的反向大转圈
    angleRef.current += delta;
    setRotateAngle(angleRef.current);
    setConfig('mood_angle', angleRef.current);
    handleMoodSelect(mood);
  };

  const handleMoodSelect = useCallback(async (mood: Mood) => {
    if (animating) return;
    setAnimating(true);
    setMood(mood);

    if (followTheme) {
      const theme = MOOD_CONFIGS[mood].theme;
      document.documentElement.setAttribute('data-theme', theme);
    }

    if (!moodDataRef.current[mood]) {
      const cached = await getDailyCache<CachedMoodPlaylist>(`mood_${mood}`);
      if (cached) {
        moodDataRef.current[mood] = cached;
      } else {
        const tag = getTodaysTag(mood);
        getTopPlaylist(tag, 1, 0).then((res) => {
          const playlists = res.data.playlists;
          if (playlists?.length) {
            moodDataRef.current[mood] = { playlistId: playlists[0].id, tracks: [] };
          }
        }).catch(() => {});
      }
    }

    setTimeout(() => setAnimating(false), 800);
  }, [animating, followTheme, setMood]);

  const playMoodPlaylist = useCallback(async () => {
    if (!selectedMood) return;
    setPlayingMood(selectedMood);

    const cached = moodDataRef.current[selectedMood];
    if (cached?.tracks?.length) {
      setQueue(cached.tracks);
      play(cached.tracks[0]);
      return;
    }

    try {
      const tag = getTodaysTag(selectedMood);
      const res = await getTopPlaylist(tag, 1, 0);
      const playlists = res.data.playlists;
      if (!playlists?.length) return;
      const pl = playlists[Math.floor(Math.random() * playlists.length)];
      const trackRes = await getPlaylistTrackAll(pl.id, 50);
      const tracks = trackRes.data.songs || [];
      if (!tracks.length) return;
      const resUrl = await getSongUrl(tracks.map((t: any) => t.id));
      const urlList: Array<{ id: number; url: string }> = resUrl.data?.data || [];
      const urlMap = new Map<number, string>();
      urlList.forEach((item) => {
        if (item.id && item.url) urlMap.set(item.id, item.url);
      });

      const valid = tracks
        .filter((t: any) => urlMap.has(t.id))
        .map((t: any) => ({ ...t, url: urlMap.get(t.id) }));

      if (!valid.length) return;
      moodDataRef.current[selectedMood] = { playlistId: pl.id, tracks: valid };
      setDailyCache(`mood_${selectedMood}`, { playlistId: pl.id, tracks: valid });
      setQueue(valid);
      play(valid[0]);
    } catch {}
  }, [selectedMood, setQueue, play, setPlayingMood]);

  const handleBannerClick = async () => {
    const mood = selectedMood || 'happy';
    let data = moodDataRef.current[mood];
    if (!data?.playlistId) {
      const cached = await getDailyCache<CachedMoodPlaylist>(`mood_${mood}`);
      if (cached?.playlistId) {
        data = cached;
        moodDataRef.current[mood] = cached;
      } else {
        const tag = getTodaysTag(mood);
        const res = await getTopPlaylist(tag, 1, 0);
        const playlists = res.data.playlists;
        if (playlists?.length) {
          data = { playlistId: playlists[0].id, tracks: [] };
          moodDataRef.current[mood] = data;
        }
      }
    }
    if (data?.playlistId) {
      navigate(`/playlist/${data.playlistId}`);
    }
  };

  const config = selectedMood ? MOOD_CONFIGS[selectedMood] : null;
  const dayOfWeek = new Date().getDay(); // 0=周日, 1=周一 ... 6=周六
  const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周一=0, 周二=1 ... 周日=6
  const currentBg = config?.bgImages?.[dayIdx] || config?.bgImage || 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200';

  return (
    <div
      className="relative h-64 rounded-[45px] overflow-hidden mb-12 shadow-xl border border-white/15 group shrink-0 cursor-pointer"
      onClick={handleBannerClick}
    >
      <img
        src={currentBg}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000"
      />
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-all duration-700 ${config ? `bg-gradient-to-t ${config.gradient}` : ''}`} />

      {/* 心情选择器 */}
      <div className="absolute top-3 right-3 z-10" style={{ width: 100, height: 100 }} onClick={(e) => e.stopPropagation()}>
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotate(${rotateAngle}deg)`,
            transition: enableTransition ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
            transformOrigin: '50px 50px',
          }}
        >
          {MOODS.map((mood, i) => {
            const cfg = MOOD_CONFIGS[mood];
            const isActive = selectedMood === mood;
            const current = getCurrentPositions()[i];
            const isBottom = current.isBottom;
            return (
              <button
                key={mood}
                onClick={() => !isBottom && handleMoodClick(mood, i)}
                disabled={isBottom}
                className={`absolute rounded-full flex items-center justify-center transition-all duration-200 ${
                  isBottom ? 'cursor-default' : 'cursor-pointer'
                } ${
                  isActive
                    ? 'bg-white/25 backdrop-blur-md shadow-lg border border-white/30'
                    : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:border-white/25'
                }`}
                style={{
                  width: BLADE_SIZE,
                  height: BLADE_SIZE,
                  left: bladePositions[i].x,
                  top: bladePositions[i].y,
                  transform: `rotate(${-rotateAngle}deg)`,
                  transition: enableTransition
                    ? 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), background 0.2s, border-color 0.2s, box-shadow 0.2s'
                    : 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                }}
                title={t(`mood.${mood}`)}
              >
                <img
                  src={cfg.icon}
                  style={{ width: 24, height: 24 }}
                  alt={t(`mood.${mood}`)}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 文字和播放 */}
      <div className="absolute inset-0 flex flex-col justify-center p-14 pointer-events-none">
        <h2 className="text-3xl font-bold text-white mb-2 transition-all duration-500">
          {selectedMood ? t(`mood.${selectedMood}`) : t('banner.daily_journey')}
        </h2>
        <p className="text-white/70 text-sm mb-4 transition-all duration-500 max-w-md">
          {phrase}
        </p>
        <div
          onClick={(e) => { e.stopPropagation(); selectedMood ? playMoodPlaylist() : togglePlay(); }}
          className="w-14 h-14 clear-glass-card rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all pointer-events-auto"
        >
          <FontAwesomeIcon icon={selectedMood && playingMood === selectedMood && isPlaying ? faPause : faPlay} className={!(selectedMood && playingMood === selectedMood && isPlaying) ? 'ml-1' : ''} />
        </div>
      </div>
    </div>
  );
};

export default Banner;
