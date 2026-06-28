import { useState, useCallback, useEffect, useMemo, type FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faServer,
  faInfoCircle,
  faCheck,
  faPalette,
  faCircleCheck,
  faHardDrive,
} from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useMood } from '../../context/MoodContext';
import { loadConfig, setConfig } from '../../services/config';
import { formatSize } from '../../utils/format';

interface ThemeOption {
  id: string;
  name: string;
  from: string;
  via: string;
  to: string;
  accent: string;
}

const THEMES: ThemeOption[] = [
  { id: 'midnight', name: 'Midnight', from: '#0f172a', via: '#1e1b4b', to: '#0f172a', accent: '#22d3ee' },
  { id: 'aurora', name: 'Aurora', from: '#0a1628', via: '#0d2832', to: '#0a1628', accent: '#22d3ee' },
  { id: 'obsidian', name: 'Obsidian', from: '#0a0a0a', via: '#111111', to: '#0a0a0a', accent: '#fb923c' },
  { id: 'rose', name: 'Rose', from: '#1a0a1a', via: '#2a1520', to: '#1a0a1a', accent: '#f472b6' },
  { id: 'forest', name: 'Forest', from: '#0a1a0a', via: '#0f2418', to: '#0a1a0a', accent: '#4ade80' },
  { id: 'mood-happy', name: '天蓝', from: '#0c1e30', via: '#14304a', to: '#0c1e30', accent: '#7dd3fc' },
  { id: 'mood-calm', name: '薄荷', from: '#061a12', via: '#0a2818', to: '#061a12', accent: '#34d399' },
  { id: 'mood-sad', name: '深夜', from: '#060a14', via: '#0a1220', to: '#060a14', accent: '#60a5fa' },
];

const MIN_STORAGE_MB = 500;
const MAX_STORAGE_MB = 10240;

const SettingsPage: FC = () => {
  const { volume, setVolume } = usePlayer();
  const { followTheme: moodFollowTheme, setFollowTheme: setMoodFollowTheme } = useMood();
  const [saved, setSaved] = useState(false);
  const [initDone, setInitDone] = useState(false);

  // 配置状态
  const [theme, setTheme] = useState<string | null>(null);
  const [glassOpacity, setGlassOpacity] = useState<number | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [storageLimit, setStorageLimit] = useState(2048);
  const [storageDir, setStorageDir] = useState('');
  const [storageSize, setStorageSize] = useState(0);

  // 初始化：从后端加载配置
  useEffect(() => {
    loadConfig().then((res) => {
      const cfg = res.data || {};
      setTheme(cfg.theme || 'midnight');
      setGlassOpacity(cfg.glass_bg_opacity !== undefined ? Math.round(Number(cfg.glass_bg_opacity) * 100) : 100);
      setApiUrl(cfg.api_url || '');
      setStorageLimit(cfg.storage_limit ? Math.round(Number(cfg.storage_limit) / (1024 * 1024)) : 2048);
      setStorageDir(res.dir || '');
      setStorageSize(res.size || 0);
      setInitDone(true);
    }).catch(() => setInitDone(true));
  }, []);

  const handleThemeChange = useCallback((id: string) => {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    setConfig('theme', id);
  }, []);

  const handleGlassOpacityChange = useCallback((value: number) => {
    setGlassOpacity(value);
    const opacity = (value / 100).toFixed(2);
    document.documentElement.style.setProperty('--glass-bg-opacity', opacity);
    setConfig('glass_bg_opacity', parseFloat(opacity));
  }, []);

  const handleSaveApiUrl = () => {
    setConfig('api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleStorageLimitChange = (value: number) => {
    setStorageLimit(value);
    setConfig('storage_limit', value * 1024 * 1024);
  };

  const usagePercent = useMemo(() => {
    const limitBytes = storageLimit * 1024 * 1024;
    if (!limitBytes) return 0;
    return Math.min(100, Math.round((storageSize / limitBytes) * 100));
  }, [storageSize, storageLimit]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="p-10">
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">设置</h1>
        <p className="text-white/40 text-sm mb-10">个性化你的音乐体验</p>

        <div className="space-y-8">
          {/* 主题设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faPalette} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">主题</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-5">
              {!initDone ? (
                <div className="flex items-center justify-center py-8 text-white/30 text-xs">加载中...</div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {THEMES.map((t) => {
                      const isActive = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleThemeChange(t.id)}
                          className={`group relative flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                            isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                          }`}
                          title={t.name}
                        >
                          <div
                            className="w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${t.from}, ${t.via})`,
                              borderColor: isActive ? t.accent : 'rgba(255,255,255,0.15)',
                              boxShadow: isActive ? `0 0 12px ${t.accent}44` : 'none',
                            }}
                          >
                            {isActive && (
                              <FontAwesomeIcon icon={faCircleCheck} className="text-white text-xs drop-shadow-md" />
                            )}
                          </div>
                          <span
                            className="text-[10px] font-medium transition-colors"
                            style={{ color: isActive ? t.accent : 'rgba(255,255,255,0.35)' }}
                          >
                            {t.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">玻璃面板透明度</span>
                      <span className="text-xs text-white/40 font-mono">{glassOpacity ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={glassOpacity ?? 100}
                      onChange={(e) => handleGlassOpacityChange(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-theme-accent"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/25">完全透明</span>
                      <span className="text-[10px] text-white/25">完全不透明</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 心情设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <img src="/happy.svg" className="w-5 h-5" alt="心情" />
              </div>
              <h3 className="text-sm font-bold text-white">心情</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70">心情切换时跟随变换主题</p>
                  <p className="text-[10px] text-white/30 mt-0.5">关闭后切换心情只换歌单，不换主题</p>
                </div>
                <button
                  onClick={() => setMoodFollowTheme(!moodFollowTheme)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    moodFollowTheme ? 'bg-theme-accent' : 'bg-white/15'
                  }`}
                >
                  <div
                    className="absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
                    style={{ transform: moodFollowTheme ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* 音频设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faVolumeHigh} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">音频设置</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">音量</span>
                  <span className="text-xs text-white/40 font-mono">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-theme-accent"
                />
              </div>
            </div>
          </section>

          {/* API 设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faServer} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">API 设置</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-2">后端地址</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="留空使用默认地址"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-theme-accent-50 transition-colors"
                />
              </div>
              <button
                onClick={handleSaveApiUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-accent-10 text-theme-accent text-xs font-medium hover:bg-theme-accent-20 transition-colors"
              >
                {saved ? <FontAwesomeIcon icon={faCheck} /> : null}
                {saved ? '已保存' : '保存设置'}
              </button>
            </div>
          </section>

          {/* 存储管理（本地硬盘） */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faHardDrive} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">存储管理</h3>
              <span className="text-[10px] text-white/30 ml-auto">{initDone ? `${usagePercent}% 已用` : '加载中...'}</span>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              {/* 存储路径 */}
              <div>
                <label className="text-xs text-white/60 block mb-2">数据目录</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/70 font-mono truncate">
                  {storageDir || '加载中...'}
                </div>
              </div>

              {/* 容量限制滑块 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">存储上限</span>
                  <span className="text-xs text-white/40 font-mono">{storageLimit} MB</span>
                </div>
                <input
                  type="range"
                  min={MIN_STORAGE_MB}
                  max={MAX_STORAGE_MB}
                  step={100}
                  value={storageLimit}
                  onChange={(e) => handleStorageLimitChange(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-theme-accent"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/25">{MIN_STORAGE_MB} MB</span>
                  <span className="text-[10px] text-white/25">{MAX_STORAGE_MB / 1024} GB</span>
                </div>
              </div>

              {/* 进度条 */}
              <div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${usagePercent}%`,
                      backgroundColor: usagePercent > 90 ? '#ef4444' : 'var(--theme-accent)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-white/30">已用 {formatSize(storageSize)}</span>
                  <span className="text-[10px] text-white/30">上限 {formatSize(storageLimit * 1024 * 1024)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 关于 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faInfoCircle} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">关于</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-theme-accent" />
                <div>
                  <p className="text-sm font-bold text-white">Aurora Music</p>
                  <p className="text-[10px] text-white/30 mt-0.5">v1.0.0 · React + TypeScript</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
