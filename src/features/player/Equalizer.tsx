import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '../../i18n';

const PRESETS: Record<string, number[]> = {
  'flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'pop': [-1, 1, 3, 4, 3, 0, -1, -1, -1, -1],
  'rock': [4, 3, -1, -3, -1, 2, 4, 5, 5, 5],
  'jazz': [3, 2, 0, 1, -1, -1, 0, 1, 2, 3],
  'classical': [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  'bass': [6, 5, 4, 2, 0, -1, -1, -1, -1, -1],
  'vocal': [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
};

const FREQUENCIES = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];

interface EqualizerProps {
  onChange?: (values: number[]) => void;
}

const Equalizer: FC<EqualizerProps> = ({ onChange }) => {
  const { t } = useI18n();
  const [values, setValues] = useState<number[]>(PRESETS['flat']);
  const [preset, setPreset] = useState('flat');
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = useCallback((name: string) => {
    setPreset(name);
    setValues(PRESETS[name]);
    onChange?.(PRESETS[name]);
  }, [onChange]);

  const handleSliderChange = useCallback((index: number, value: number) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setPreset('custom');
    onChange?.(values);
  }, [values, onChange]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
        title={t('equalizer.title')}
      >
        <FontAwesomeIcon icon={faSliders} className="text-[10px] text-white/30 hover:text-white/60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 w-[320px] p-4 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 shadow-xl z-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-white/60">{t('equalizer.title')}</span>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 outline-none"
              >
                <option value="flat">{t('equalizer.default')}</option>
                <option value="pop">{t('equalizer.pop')}</option>
                <option value="rock">{t('equalizer.rock')}</option>
                <option value="jazz">{t('equalizer.jazz')}</option>
                <option value="classical">{t('equalizer.classical')}</option>
                <option value="bass">{t('equalizer.bass')}</option>
                <option value="vocal">{t('equalizer.vocal')}</option>
              </select>
            </div>

            <div className="flex items-end gap-1.5 h-[120px]">
              {values.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-white/30 font-mono">{val > 0 ? `+${val}` : val}</span>
                  <input
                    type="range"
                    min={-6}
                    max={6}
                    value={val}
                    onChange={(e) => handleSliderChange(i, Number(e.target.value))}
                    className="w-[18px] h-[80px] appearance-none bg-transparent cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      accentColor: 'var(--theme-accent)',
                    }}
                  />
                  <span className="text-[8px] text-white/25">{FREQUENCIES[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Equalizer;
