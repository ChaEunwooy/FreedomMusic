import type { FC } from 'react';
import { useI18n } from '../../i18n';

const LanguageSettings: FC = () => {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLang('zh')}
        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
          lang === 'zh'
            ? 'bg-theme-accent text-white'
            : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
          lang === 'en'
            ? 'bg-theme-accent text-white'
            : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
        }`}
      >
        English
      </button>
    </div>
  );
};

export default LanguageSettings;
