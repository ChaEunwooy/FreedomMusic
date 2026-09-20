import { useState, useCallback, useEffect, useMemo, type FC } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faServer,
  faInfoCircle,
  faCheck,
  faPalette,
  faCircleCheck,
  faHardDrive,
  faRotateLeft,
  faPlus,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useMood } from '../../context/MoodContext';
import { useI18n } from '../../i18n';
import { loadConfig, setConfig } from '../../services/config';
import { formatSize } from '../../utils/format';
import LanguageSettings from './LanguageSettings';
import {
  THEMES,
  THEME_MAP,
  type ThemeColors,
  type CustomTheme,
  injectThemeOverrides,
} from '../../utils/theme';

const BUILTIN_IDS = new Set(['midnight', 'aurora', 'obsidian', 'rose', 'forest', 'mood-happy', 'mood-calm', 'mood-sad']);
const MIN_STORAGE_MB = 500;
const MAX_STORAGE_MB = 10240;

function getDefaultColors(id: string): ThemeColors {
  const t = THEME_MAP[id];
  return t ? { from: t.from, via: t.via, to: t.to, accent: t.accent } : { from: '#0f172a', via: '#1e1b4b', to: '#0f172a', accent: '#22d3ee' };
}

const SettingsPage: FC = () => {
  const { volume, setVolume } = usePlayer();
  const { followTheme: moodFollowTheme, setFollowTheme: setMoodFollowTheme } = useMood();
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [initDone, setInitDone] = useState(false);

  const [theme, setTheme] = useState<string | null>(null);
  const [glassOpacity, setGlassOpacity] = useState<number | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [storageLimit, setStorageLimit] = useState(2048);
  const [storageDir, setStorageDir] = useState('');
  const [storageSize, setStorageSize] = useState(0);

  const [themeEdits, setThemeEdits] = useState<Record<string, ThemeColors>>({});
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newFrom, setNewFrom] = useState('#1a1a2e');
  const [newVia, setNewVia] = useState('#16213e');
  const [newTo, setNewTo] = useState('#1a1a2e');
  const [newAccent, setNewAccent] = useState('#e94560');
  const [editFrom, setEditFrom] = useState('#0f172a');
  const [editVia, setEditVia] = useState('#1e1b4b');
  const [editTo, setEditTo] = useState('#0f172a');
  const [editAccent, setEditAccent] = useState('#22d3ee');
  const [aboutOpen, setAboutOpen] = useState(false);

  const allThemes = useMemo(() => [...THEMES, ...customThemes], [customThemes]);
  const allThemeMap = useMemo(() => Object.fromEntries(allThemes.map((t) => [t.id, t])), [allThemes]);
  const isCustomTheme = theme ? !BUILTIN_IDS.has(theme) : false;
  const isEdited = theme ? !!themeEdits[theme] : false;

  useEffect(() => {
    loadConfig().then((res) => {
      const cfg = res.data || {};
      setTheme(cfg.theme || 'midnight');
      setGlassOpacity(cfg.glass_bg_opacity !== undefined ? Math.round(Number(cfg.glass_bg_opacity) * 100) : 100);
      setApiUrl(cfg.api_url || '');
      setStorageLimit(cfg.storage_limit ? Math.round(Number(cfg.storage_limit) / (1024 * 1024)) : 2048);
      setStorageDir(res.dir || '');
      setStorageSize(res.size || 0);
      const edits = (cfg.theme_edits as Record<string, ThemeColors>) || {};
      setThemeEdits(edits);
      const customs = (cfg.custom_themes as CustomTheme[]) || [];
      setCustomThemes(customs);
      injectThemeOverrides({ ...edits, ...Object.fromEntries(customs.map((t) => [t.id, t])) });
      const currentId = (cfg.theme as string) || 'midnight';
      const c = edits[currentId] || allThemeMap[currentId] || getDefaultColors(currentId);
      setEditFrom(c.from);
      setEditVia(c.via);
      setEditTo(c.to);
      setEditAccent(c.accent);
      setInitDone(true);
    }).catch(() => setInitDone(true));
  }, []);

  const handleThemeChange = useCallback((id: string) => {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    setConfig('theme', id);
    const c = themeEdits[id] || allThemeMap[id] || getDefaultColors(id);
    setEditFrom(c.from);
    setEditVia(c.via);
    setEditTo(c.to);
    setEditAccent(c.accent);
  }, [themeEdits, allThemeMap]);

  const handleEditColorChange = useCallback((field: 'from' | 'via' | 'to' | 'accent', value: string) => {
    const setters = { from: setEditFrom, via: setEditVia, to: setEditTo, accent: setEditAccent };
    setters[field](value);
  }, []);

  const handleSaveThemeEdit = useCallback(() => {
    if (!theme) return;
    const colors: ThemeColors = { from: editFrom, via: editVia, to: editTo, accent: editAccent };
    const next = { ...themeEdits, [theme]: colors };
    setThemeEdits(next);
    injectThemeOverrides({ ...next, ...Object.fromEntries(customThemes.map((t) => [t.id, t])) });
    setConfig('theme_edits', next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [theme, editFrom, editVia, editTo, editAccent, themeEdits, customThemes]);

  const handleResetTheme = useCallback(() => {
    if (!theme) return;
    const next = { ...themeEdits };
    delete next[theme];
    setThemeEdits(next);
    injectThemeOverrides({ ...next, ...Object.fromEntries(customThemes.map((t) => [t.id, t])) });
    setConfig('theme_edits', next);
    const c = allThemeMap[theme] || getDefaultColors(theme);
    setEditFrom(c.from);
    setEditVia(c.via);
    setEditTo(c.to);
    setEditAccent(c.accent);
  }, [theme, themeEdits, customThemes, allThemeMap]);

  const handleAddCustomTheme = useCallback(() => {
    const name = newThemeName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const t: CustomTheme = { id, name, from: newFrom, via: newVia, to: newTo, accent: newAccent };
    const next = [...customThemes, t];
    setCustomThemes(next);
    setConfig('custom_themes', next);
    injectThemeOverrides({ ...themeEdits, ...Object.fromEntries(next.map((x) => [x.id, x])) });
    setAddModalOpen(false);
    setNewThemeName('');
    handleThemeChange(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [newThemeName, newFrom, newVia, newTo, newAccent, customThemes, themeEdits, handleThemeChange]);

  const handleDeleteCustomTheme = useCallback((id: string) => {
    const nextThemes = customThemes.filter((t) => t.id !== id);
    setCustomThemes(nextThemes);
    setConfig('custom_themes', nextThemes);

    const nextEdits = { ...themeEdits };
    delete nextEdits[id];
    setThemeEdits(nextEdits);
    setConfig('theme_edits', nextEdits);

    injectThemeOverrides({ ...nextEdits, ...Object.fromEntries(nextThemes.map((t) => [t.id, t])) });

    if (theme === id) {
      handleThemeChange('midnight');
    }
  }, [customThemes, themeEdits, theme, handleThemeChange]);

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
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">{t('settings.title')}</h1>
        <p className="text-white/40 text-sm mb-10">{t('settings.subtitle')}</p>

        <div className="space-y-8">
          {/* 主题设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faPalette} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('settings.theme')}</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-5">
              {!initDone ? (
                <div className="flex items-center justify-center py-8 text-white/30 text-xs">{t('loading')}</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    {allThemes.map((th) => {
                      const isActive = theme === th.id;
                      const c = themeEdits[th.id] || th;
                      const isCustom = !BUILTIN_IDS.has(th.id);
                      return (
                        <button
                          key={th.id}
                          onClick={() => handleThemeChange(th.id)}
                          className={`group relative flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                            isActive ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'
                          }`}
                          title={th.name}
                        >
                          <div
                            className="w-10 h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${c.from}, ${c.via})`,
                              borderColor: isActive ? c.accent : 'rgba(255,255,255,0.15)',
                              boxShadow: isActive ? `0 0 12px ${c.accent}44` : 'none',
                            }}
                          >
                            {isActive && (
                              <FontAwesomeIcon icon={faCircleCheck} className="text-white text-xs drop-shadow-md" />
                            )}
                          </div>
                          <span
                            className="text-[10px] font-medium transition-colors flex items-center gap-1"
                            style={{ color: isActive ? c.accent : 'rgba(255,255,255,0.35)' }}
                          >
                            {th.name}
                            {isCustom && <span className="w-1.5 h-1.5 rounded-full bg-theme-accent/60" title={t('settings.custom_theme')} />}
                          </span>
                          {isCustom && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteCustomTheme(th.id); }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/60 hover:bg-red-500 text-white flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all"
                              title={t('settings.delete_theme')}
                            >
                              <FontAwesomeIcon icon={faTrash} className="text-[8px]" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setAddModalOpen(true)}
                      className="flex flex-col items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all duration-300"
                      title={t('settings.add_theme')}
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faPlus} className="text-white/40 text-xs" />
                      </div>
                      <span className="text-[10px] font-medium text-white/35">{t('settings.new')}</span>
                    </button>
                  </div>

                  {theme && (
                    <div className="pt-2 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">
                          {t('settings.edit_theme', { name: allThemeMap[theme]?.name || theme })}
                          {isEdited && !isCustomTheme && <span className="text-theme-accent ml-1">{t('settings.customized')}</span>}
                          {isCustomTheme && <span className="text-theme-accent ml-1">{t('settings.custom')}</span>}
                        </span>
                        {isEdited && !isCustomTheme && (
                          <button
                            onClick={handleResetTheme}
                            className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                            title={t('settings.reset_colors')}
                          >
                            <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                            {t('settings.reset')}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { label: t('settings.bg_color_1'), field: 'from' as const, value: editFrom },
                          { label: t('settings.bg_color_2'), field: 'via' as const, value: editVia },
                          { label: t('settings.bg_color_3'), field: 'to' as const, value: editTo },
                          { label: t('settings.accent_color'), field: 'accent' as const, value: editAccent },
                        ]).map((c) => (
                          <div key={c.field} className="flex items-center gap-2">
                            <label className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/20 cursor-pointer shrink-0">
                              <input
                                type="color"
                                value={c.value}
                                onChange={(e) => handleEditColorChange(c.field, e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <div className="w-full h-full" style={{ backgroundColor: c.value }} />
                            </label>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] text-white/50 block">{c.label}</span>
                              <input
                                type="text"
                                value={c.value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (/^#[0-9a-f]{6}$/i.test(v)) handleEditColorChange(c.field, v);
                                }}
                                className="w-full bg-transparent text-[11px] text-white/70 font-mono outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleSaveThemeEdit}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-accent-10 text-theme-accent text-xs font-medium hover:bg-theme-accent-20 transition-colors"
                      >
                        {saved ? <FontAwesomeIcon icon={faCheck} /> : null}
                        {saved ? t('saved') : t('save')}
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60">{t('settings.glass_opacity')}</span>
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
                      <span className="text-[10px] text-white/25">{t('settings.transparent')}</span>
                      <span className="text-[10px] text-white/25">{t('settings.opaque')}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/70">{t('settings.mood_follow')}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{t('settings.mood_follow_hint')}</p>
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
                </>
              )}
            </div>
          </section>

          {/* 音频设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faVolumeHigh} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('settings.audio')}</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">{t('settings.volume')}</span>
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
              <h3 className="text-sm font-bold text-white">{t('settings.api')}</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-2">{t('settings.backend_url')}</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder={t('settings.backend_placeholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-theme-accent-50 transition-colors"
                />
              </div>
              <button
                onClick={handleSaveApiUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-accent-10 text-theme-accent text-xs font-medium hover:bg-theme-accent-20 transition-colors"
              >
                {saved ? <FontAwesomeIcon icon={faCheck} /> : null}
                {saved ? t('saved') : t('save')}
              </button>
            </div>
          </section>

          {/* 存储管理（本地硬盘） */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faHardDrive} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('settings.storage')}</h3>
              <span className="text-[10px] text-white/30 ml-auto">{initDone ? t('settings.used_percent', { percent: usagePercent }) : t('loading')}</span>
            </div>
            <div className="clear-glass p-5 rounded-2xl space-y-4">
              {/* 存储路径 */}
              <div>
                <label className="text-xs text-white/60 block mb-2">{t('settings.data_dir')}</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/70 font-mono truncate">
                  {storageDir || t('loading')}
                </div>
              </div>

              {/* 容量限制滑块 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60">{t('settings.storage_limit')}</span>
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
                  <span className="text-[10px] text-white/30">{t('settings.used', { size: formatSize(storageSize) })}</span>
                  <span className="text-[10px] text-white/30">{t('settings.limit', { size: formatSize(storageLimit * 1024 * 1024) })}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 语言设置 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faInfoCircle} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('settings.language')}</h3>
            </div>
            <div className="clear-glass p-5 rounded-2xl">
              <LanguageSettings />
            </div>
          </section>

          {/* 关于 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-theme-accent-10 flex items-center justify-center">
                <FontAwesomeIcon icon={faInfoCircle} className="text-theme-accent text-xs" />
              </div>
              <h3 className="text-sm font-bold text-white">{t('settings.about')}</h3>
            </div>
            <button
              onClick={() => setAboutOpen(true)}
              className="clear-glass p-5 rounded-2xl w-full text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-theme-accent" />
                <div>
                  <p className="text-sm font-bold text-white">FreedomMusic</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{t('about.version')}</p>
                </div>
              </div>
            </button>
          </section>
        </div>
      </div>

      {/* 关于弹窗 */}
      {aboutOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="relative w-[480px] max-h-[80vh] rounded-[28px] p-6 clear-glass flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{t('about.title')}</h3>
              <button
                onClick={() => setAboutOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-5">
              {/* 头部 */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center">
                  <span className="text-white font-extrabold text-xl">F</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">FreedomMusic</h2>
                  <p className="text-xs text-white/40 mt-0.5">{t('about.version')}</p>
                </div>
              </div>

              {/* 介绍 */}
              <p className="text-sm text-white/60 leading-relaxed">{t('about.description')}</p>

              {/* 设计理念 */}
              <div>
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2">{t('about.philosophy')}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{t('about.philosophy_text')}</p>
              </div>

              {/* 功能亮点 */}
              <div>
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3">{t('about.features')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    t('about.feature_1'),
                    t('about.feature_2'),
                    t('about.feature_3'),
                    t('about.feature_4'),
                    t('about.feature_5'),
                    t('about.feature_6'),
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                      <span className="text-cyan-400 mt-0.5">✦</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部信息 */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="text-[10px] text-white/25">
                  <span>{t('about.author')}</span>
                  <span className="mx-2">·</span>
                  <span>{t('about.license')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 添加自定义主题弹窗 */}
      {addModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="relative w-[400px] rounded-[28px] p-6 clear-glass flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{t('settings.add_theme')}</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-white/60 block mb-2">{t('settings.theme_name')}</label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder={t('settings.theme_name_placeholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-theme-accent-50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: t('settings.bg_color_1'), value: newFrom, setter: setNewFrom },
                  { label: t('settings.bg_color_2'), value: newVia, setter: setNewVia },
                  { label: t('settings.bg_color_3'), value: newTo, setter: setNewTo },
                  { label: t('settings.accent_color'), value: newAccent, setter: setNewAccent },
                ]).map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <label className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/20 cursor-pointer shrink-0">
                      <input
                        type="color"
                        value={c.value}
                        onChange={(e) => c.setter(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: c.value }} />
                    </label>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-white/50 block">{c.label}</span>
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-f]{6}$/i.test(v)) c.setter(v);
                        }}
                        className="w-full bg-transparent text-[11px] text-white/70 font-mono outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddCustomTheme}
              disabled={!newThemeName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-theme-accent-10 text-theme-accent text-xs font-medium hover:bg-theme-accent-20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faPlus} />
              {t('settings.create_theme')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SettingsPage;
