import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faMoon,
  faCloudSun,
  faCloudMoon,
  faCloud,
  faCloudRain,
  faSnowflake,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import WeatherPicker from './WeatherPicker';
import { fetchWeather } from '../services/weather';
import { provinces, type City } from '../data/cities';
import { useI18n } from '../i18n';

const DEFAULT_CITY: City = { name: '北京', lat: 39.9042, lon: 116.4074 };
const STORAGE_KEY = 'weather_city';

interface WeatherInfo {
  temp: number;
  weatherCode: number;
  description: string;
  city: string;
}

function getWeatherIcon(weatherCode: number, isDay: boolean) {
  if (weatherCode === 0) return isDay ? faSun : faMoon;
  if (weatherCode <= 3) return isDay ? faCloudSun : faCloudMoon;
  if (weatherCode <= 48) return faCloud;
  if (weatherCode <= 67 || (weatherCode >= 80 && weatherCode <= 82)) return faCloudRain;
  if (weatherCode >= 71 && weatherCode <= 77) return faSnowflake;
  if (weatherCode >= 85 && weatherCode <= 86) return faSnowflake;
  if (weatherCode >= 95) return faBolt;
  return faCloud;
}

function getWeatherColor(weatherCode: number, isDay: boolean) {
  if (weatherCode === 0) return isDay ? 'text-orange-400' : 'text-blue-300';
  if (weatherCode <= 3) return isDay ? 'text-amber-300' : 'text-slate-300';
  if (weatherCode <= 48) return 'text-slate-400';
  if (weatherCode <= 67 || (weatherCode >= 80 && weatherCode <= 82)) return 'text-blue-400';
  if (weatherCode >= 71 && weatherCode <= 77) return 'text-cyan-300';
  if (weatherCode >= 85 && weatherCode <= 86) return 'text-cyan-300';
  if (weatherCode >= 95) return 'text-purple-400';
  return 'text-slate-400';
}

const WeatherWidget: FC = () => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [city, setCity] = useState<City>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as City;
        const found = provinces.some((p) => p.cities.some((c) => c.name === parsed.name));
        if (found) return parsed;
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_CITY;
  });
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useI18n();

  const loadWeather = useCallback(async (targetCity: City) => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchWeather(targetCity.lat, targetCity.lon);
      setWeather({ ...data, city: targetCity.name });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(city);
    const timer = setInterval(() => loadWeather(city), 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [city, loadWeather]);

  const handleSelect = useCallback((newCity: City) => {
    setCity(newCity);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCity));
  }, []);

  const isDay = (() => {
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  })();

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className="clear-glass-card flex items-center gap-3 py-2.5 px-5 transition-transform hover:scale-105 cursor-pointer"
        title={t('weather.click_to_change')}
      >
        {loading || !weather ? (
          <>
            <FontAwesomeIcon icon={faCloud} className="text-white/30 text-lg animate-pulse" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold text-white/50">--°C</span>
              <span className="text-[10px] text-white/30">{error ? t('weather.fetch_failed') : city.name}</span>
            </div>
          </>
        ) : (
          <>
            <FontAwesomeIcon
              icon={getWeatherIcon(weather.weatherCode, isDay)}
              className={`${getWeatherColor(weather.weatherCode, isDay)} text-lg`}
            />
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold text-white">{Math.round(weather.temp)}°C</span>
              <span className="text-[10px] text-white/40">
                {weather.city} · {weather.description}
              </span>
            </div>
          </>
        )}
      </button>

      <WeatherPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        selectedCity={city}
      />
    </>
  );
};

export default WeatherWidget;
