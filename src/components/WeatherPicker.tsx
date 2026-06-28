import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck } from '@fortawesome/free-solid-svg-icons';
import { provinces, type City } from '../data/cities';
import { useI18n } from '../i18n';

interface WeatherPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (city: City) => void;
  selectedCity?: City;
}

export default function WeatherPicker({ open, onClose, onSelect, selectedCity }: WeatherPickerProps) {
  const [activeProvince, setActiveProvince] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    if (open && selectedCity) {
      const idx = provinces.findIndex((p) => p.cities.some((c) => c.name === selectedCity.name));
      if (idx !== -1) setActiveProvince(idx);
    }
  }, [open, selectedCity]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[480px] h-[500px] rounded-[28px] p-6 clear-glass flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('weather.select_city')}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* 省份列表 */}
          <div className="w-32 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {provinces.map((p, i) => (
              <button
                key={p.name}
                onClick={() => setActiveProvince(i)}
                className={`px-3 py-2 rounded-xl text-sm text-left transition-all ${
                  activeProvince === i
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* 城市列表 */}
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {provinces[activeProvince].cities.map((city) => (
              <button
                key={city.name}
                onClick={() => {
                  onSelect(city);
                  onClose();
                }}
                className={`px-3 py-2 rounded-xl text-sm text-left flex items-center justify-between transition-all ${
                  selectedCity?.name === city.name
                    ? 'bg-white/15 text-cyan-400 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{city.name}</span>
                {selectedCity?.name === city.name && (
                  <FontAwesomeIcon icon={faCheck} className="text-cyan-400 text-xs" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
