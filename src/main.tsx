import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadConfigSync } from './services/config'
import { MOOD_CONFIGS, type Mood } from './features/discover/moodData'

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function buildThemeCss(id: string, c: { from: string; via: string; to: string; accent: string }): string {
  const rgb = hexToRgb(c.accent);
  return `
html[data-theme="${id}"] {
  --theme-bg-from: ${c.from};
  --theme-bg-via: ${c.via};
  --theme-bg-to: ${c.to};
  --theme-accent: ${c.accent};
  --theme-accent-rgb: ${rgb};
  --theme-glass-tint: ${rgb};
  --cg-border: rgba(${rgb}, 0.25);
  --cg-border-hover: rgba(${rgb}, 0.4);
  --cg-bg-base: rgba(${rgb}, 0.03);
  --cg-bg-card: rgba(${rgb}, 0.04);
  --cg-bg-card-hover: rgba(${rgb}, 0.06);
  --cg-glow-inner: rgba(${rgb}, 0.08);
  --cg-glow-inner-hover: rgba(${rgb}, 0.12);
  --cg-shadow-outer: rgba(0, 0, 0, 0.25);
  --cg-shadow-outer-hover: rgba(0, 0, 0, 0.3);
  --cg-highlight: rgba(${rgb}, 0.12);
  --cg-highlight-subtle: rgba(${rgb}, 0.04);
}`;
}

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
const edits = (cfg.theme_edits as Record<string, { from: string; via: string; to: string; accent: string }>) || {};
const customThemes = (cfg.custom_themes as { id: string; name: string; from: string; via: string; to: string; accent: string }[]) || [];
const allOverrides = { ...edits, ...Object.fromEntries(customThemes.map((t) => [t.id, t])) };
const editIds = Object.keys(allOverrides);
if (editIds.length > 0) {
  const style = document.createElement('style');
  style.id = 'theme-overrides';
  style.textContent = editIds.map((id) => buildThemeCss(id, allOverrides[id])).join('\n');
  document.head.appendChild(style);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
