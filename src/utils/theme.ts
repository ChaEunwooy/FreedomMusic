export interface ThemeColors {
  from: string;
  via: string;
  to: string;
  accent: string;
}

export interface ThemeOption extends ThemeColors {
  id: string;
  name: string;
}

export interface CustomTheme extends ThemeColors {
  id: string;
  name: string;
}

export const THEMES: ThemeOption[] = [
  { id: 'midnight', name: 'Midnight', from: '#0f172a', via: '#1e1b4b', to: '#0f172a', accent: '#22d3ee' },
  { id: 'aurora', name: 'Aurora', from: '#0a1628', via: '#0d2832', to: '#0a1628', accent: '#22d3ee' },
  { id: 'obsidian', name: 'Obsidian', from: '#0a0a0a', via: '#111111', to: '#0a0a0a', accent: '#fb923c' },
  { id: 'rose', name: 'Rose', from: '#1a0a1a', via: '#2a1520', to: '#1a0a1a', accent: '#f472b6' },
  { id: 'forest', name: 'Forest', from: '#0a1a0a', via: '#0f2418', to: '#0a1a0a', accent: '#4ade80' },
  { id: 'mood-happy', name: '天蓝', from: '#0c1e30', via: '#143a55', to: '#0c1e30', accent: '#7dd3fc' },
  { id: 'mood-calm', name: '薄荷', from: '#061a12', via: '#0a2818', to: '#061a12', accent: '#34d399' },
  { id: 'mood-sad', name: '深夜', from: '#060a14', via: '#0a1220', to: '#060a14', accent: '#60a5fa' },
];

export const THEME_MAP: Record<string, ThemeOption> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

export function buildThemeCss(id: string, c: ThemeColors): string {
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

export function injectThemeOverrides(edits: Record<string, ThemeColors>) {
  let el = document.getElementById('theme-overrides') as HTMLStyleElement | null;
  const ids = Object.keys(edits);
  if (ids.length === 0) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-overrides';
    document.head.appendChild(el);
  }
  el.textContent = ids.map((id) => buildThemeCss(id, edits[id])).join('\n');
}
