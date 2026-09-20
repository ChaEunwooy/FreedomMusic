import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadConfigSync } from './services/config'
import { MOOD_CONFIGS, type Mood } from './features/discover/moodData'
import { injectThemeOverrides, type ThemeColors } from './utils/theme'

// 同步加载配置，在 React 渲染前设置主题，避免闪烁
const cfg = loadConfigSync() as Record<string, unknown>;
const savedMood = cfg.mood as string | undefined;
const followTheme = cfg.mood_follow_theme !== false;
if (savedMood && MOOD_CONFIGS[savedMood as Mood] && followTheme) {
  document.documentElement.setAttribute('data-theme', MOOD_CONFIGS[savedMood as Mood].theme);
} else {
  const savedTheme = (cfg.theme as string) || 'midnight';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// 注入所有已编辑主题 + 自定义主题的 CSS 覆盖
const edits = (cfg.theme_edits as Record<string, ThemeColors>) || {};
const customThemes = (cfg.custom_themes as { id: string; name: string; from: string; via: string; to: string; accent: string }[]) || [];
const allOverrides = { ...edits, ...Object.fromEntries(customThemes.map((t) => [t.id, t])) };
injectThemeOverrides(allOverrides);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
