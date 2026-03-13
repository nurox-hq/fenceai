import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { fetchWeather, type WeatherFromApi } from '@/constants/api';

export type WeatherType = 'sun' | 'cloud' | 'rain' | 'storm';

export type WeatherData = {
  type: WeatherType;
  temp: number;
  tempFeelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  windDirectionDeg: number;
  updatedAt: Date;
};

export type WeatherIconName =
  | 'sunny-outline'
  | 'cloud-outline'
  | 'rainy-outline'
  | 'thunderstorm-outline';

const ICON_MAP: Record<WeatherType, WeatherIconName> = {
  sun: 'sunny-outline',
  cloud: 'cloud-outline',
  rain: 'rainy-outline',
  storm: 'thunderstorm-outline',
};

/** WMO коды Open-Meteo → тип погоды и описание */
function wmoToTypeAndDescription(code: number): { type: WeatherType; description: string } {
  const map: Record<number, { type: WeatherType; description: string }> = {
    0: { type: 'sun', description: 'Ясно' },
    1: { type: 'sun', description: 'Преимущественно ясно' },
    2: { type: 'cloud', description: 'Переменная облачность' },
    3: { type: 'cloud', description: 'Пасмурно' },
    45: { type: 'cloud', description: 'Туман' },
    48: { type: 'cloud', description: 'Изморозь' },
    51: { type: 'rain', description: 'Морось' },
    53: { type: 'rain', description: 'Морось' },
    55: { type: 'rain', description: 'Сильная морось' },
    61: { type: 'rain', description: 'Небольшой дождь' },
    63: { type: 'rain', description: 'Дождь' },
    65: { type: 'rain', description: 'Сильный дождь' },
    66: { type: 'rain', description: 'Ледяной дождь' },
    67: { type: 'rain', description: 'Сильный ледяной дождь' },
    71: { type: 'cloud', description: 'Небольшой снег' },
    73: { type: 'cloud', description: 'Снег' },
    75: { type: 'cloud', description: 'Сильный снег' },
    77: { type: 'cloud', description: 'Снежные зёрна' },
    80: { type: 'rain', description: 'Небольшой ливень' },
    81: { type: 'rain', description: 'Ливень' },
    82: { type: 'rain', description: 'Сильный ливень' },
    85: { type: 'cloud', description: 'Небольшой снегопад' },
    86: { type: 'cloud', description: 'Сильный снегопад' },
    95: { type: 'storm', description: 'Гроза' },
    96: { type: 'storm', description: 'Гроза с градом' },
    99: { type: 'storm', description: 'Сильная гроза с градом' },
  };
  const exact = map[code];
  if (exact) return exact;
  if (code >= 0 && code <= 3) return { type: 'sun', description: 'Ясно' };
  if (code >= 45 && code <= 48) return { type: 'cloud', description: 'Туман' };
  if (code >= 51 && code <= 67) return { type: 'rain', description: 'Дождь' };
  if (code >= 71 && code <= 77) return { type: 'cloud', description: 'Снег' };
  if (code >= 80 && code <= 82) return { type: 'rain', description: 'Ливень' };
  if (code >= 85 && code <= 86) return { type: 'cloud', description: 'Снегопад' };
  if (code >= 95 && code <= 99) return { type: 'storm', description: 'Гроза' };
  return { type: 'cloud', description: 'Облачно' };
}

function apiToWeatherData(api: WeatherFromApi): WeatherData {
  const { type, description } = wmoToTypeAndDescription(api.weatherCode);
  return {
    type,
    temp: Math.round(api.temp),
    tempFeelsLike: Math.round(api.feelsLike),
    description,
    humidity: api.humidity,
    windSpeed: Math.round(api.windSpeed * 10) / 10,
    windGusts: Math.round(api.windGusts * 10) / 10,
    windDirectionDeg: Math.round(api.windDirectionDeg),
    updatedAt: new Date(api.updatedAt),
  };
}

const FALLBACK_DATA: WeatherData = {
  type: 'cloud',
  temp: 0,
  tempFeelsLike: 0,
  description: '—',
  humidity: 0,
  windSpeed: 0,
  windGusts: 0,
  windDirectionDeg: 0,
  updatedAt: new Date(),
};

export function useWeather() {
  const [data, setData] = useState<WeatherData>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Нет доступа к геолокации');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const api = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
      setData(apiToWeatherData(api));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки погоды');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [refresh]);

  const icon = ICON_MAP[data.type];
  const tempFormatted = `${data.temp} °C`;

  return {
    data,
    icon,
    tempFormatted,
    refresh,
    loading,
    error,
  };
}
