import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadConfigSync } from './services/config'
import { MOOD_CONFIGS, type Mood } from './features/discover/moodData'

// 同步加载配置，在 React 渲染前设置主题，避免闪烁
const cfg = loadConfigSync() as Record<string, unknown>;
const savedMood = cfg.mood as Mood | undefined;
const followTheme = cfg.mood_follow_theme !== false;
if (savedMood && MOOD_CONFIGS[savedMood] && followTheme) {
  document.documentElement.setAttribute('data-theme', MOOD_CONFIGS[savedMood].theme);
} else {
  const savedTheme = (cfg.theme as string) || 'midnight';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
