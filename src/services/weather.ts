import axios from 'axios';

export interface WeatherData {
  temp: number;
  weatherCode: number;
  description: string;
  city: string;
}

const weatherCodeMap: Record<number, string> = {
  0: '晴',
  1: '多云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾',
  51: '毛毛雨',
  53: '毛毛雨',
  55: '毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '霰',
  80: '阵雨',
  81: '阵雨',
  82: '阵雨',
  85: '阵雪',
  86: '阵雪',
  95: '雷阵雨',
  96: '雷阵雨',
  99: '雷阵雨',
};

export async function fetchWeather(lat: number, lon: number): Promise<Pick<WeatherData, 'temp' | 'weatherCode' | 'description'>> {
  const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat,
      longitude: lon,
      current_weather: true,
      timezone: 'auto',
    },
    timeout: 10000,
  });

  const data = res.data.current_weather;
  const code = data.weathercode;
  return {
    temp: data.temperature,
    weatherCode: code,
    description: weatherCodeMap[code] || '多云',
  };
}
