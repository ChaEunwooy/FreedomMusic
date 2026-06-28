import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loadConfig, setConfig } from '../services/config';
import type { Mood } from '../features/discover/moodData';
import { MOOD_CONFIGS } from '../features/discover/moodData';

interface MoodContextType {
  mood: Mood | null;
  setMood: (mood: Mood) => void;
  followTheme: boolean;
  setFollowTheme: (v: boolean) => void;
  playingMood: Mood | null;
  setPlayingMood: (mood: Mood | null) => void;
}

const MoodContext = createContext<MoodContextType | null>(null);

export const useMood = () => {
  const ctx = useContext(MoodContext);
  if (!ctx) throw new Error('useMood must be used within MoodProvider');
  return ctx;
};

export const MoodProvider = ({ children }: { children: ReactNode }) => {
  const [mood, _setMood] = useState<Mood | null>(null);
  const [followTheme, _setFollowTheme] = useState(true);
  const [playingMood, _setPlayingMood] = useState<Mood | null>(null);

  useEffect(() => {
    loadConfig().then((res) => {
      const cfg = res.data || {};
      if (cfg.mood && MOOD_CONFIGS[cfg.mood as Mood]) {
        _setMood(cfg.mood as Mood);
        const theme = MOOD_CONFIGS[cfg.mood as Mood]?.theme;
        if (theme && cfg.mood_follow_theme !== false) {
          document.documentElement.setAttribute('data-theme', theme);
        }
      }
      if (cfg.playing_mood && MOOD_CONFIGS[cfg.playing_mood as Mood]) {
        setPlayingMood(cfg.playing_mood as Mood);
      }
      _setFollowTheme(cfg.mood_follow_theme !== false);
    }).catch(() => {});
  }, []);

  const setMood = useCallback((m: Mood) => {
    _setMood(m);
    setConfig('mood', m);
  }, []);

  const setPlayingMood = useCallback((m: Mood | null) => {
    _setPlayingMood(m);
    setConfig('playing_mood', m);
  }, []);

  const setFollowTheme = useCallback((v: boolean) => {
    _setFollowTheme(v);
    setConfig('mood_follow_theme', v);
  }, []);

  return (
    <MoodContext.Provider value={{ mood, setMood, followTheme, setFollowTheme, playingMood, setPlayingMood }}>
      {children}
    </MoodContext.Provider>
  );
};
