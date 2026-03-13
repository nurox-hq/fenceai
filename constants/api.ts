import { Platform } from 'react-native';

/**
 * Базовый URL бэкенда.
 * С физического устройства укажите IP компьютера в сети (например http://192.168.1.100:3001).
 * Эмулятор Android: 10.0.2.2:3001, симулятор iOS: localhost:3001.
 */
const getApiBase = (): string => {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  // Android-эмулятор в DEV
  if (__DEV__ && Platform.OS === 'android') return 'http://10.0.2.2:3001';
  // DEV/PROD fallback — IP машины из Metro (чтобы реальные устройства в сети видели бэкенд)
  return 'http://192.168.1.110:3001';
};

export const API_BASE = getApiBase();

export const AUTH_REGISTER_URL = `${API_BASE}/api/auth/register`;
export const AUTH_LOGIN_URL = `${API_BASE}/api/auth/login`;
export const AUTH_SEND_SMS_URL = `${API_BASE}/api/auth/send-sms-code`;
export const AUTH_VERIFY_SMS_URL = `${API_BASE}/api/auth/verify-sms-code`;
export const AUTH_QR_CREATE_URL = `${API_BASE}/api/auth/qr/create`;
export const AUTH_QR_CONSUME_URL = `${API_BASE}/api/auth/qr/consume`;

export type AuthUser = { id: string; email: string; name: string | null };
export type AuthResponse = { token: string; user: AuthUser };

export async function apiRegister(email: string, password: string, name?: string): Promise<AuthResponse> {
  const res = await fetch(AUTH_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name?.trim() || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(AUTH_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
  return data;
}

export async function apiSendSmsCode(phone: string): Promise<void> {
  const res = await fetch(AUTH_SEND_SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
}

export async function apiVerifySmsCode(phone: string, code: string): Promise<void> {
  const res = await fetch(AUTH_VERIFY_SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
}

export const MAP_OBJECTS_URL = `${API_BASE}/api/map/objects`;
export const PROJECTS_URL = `${API_BASE}/api/projects`;

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

export type WeatherFromApi = {
  temp: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  windDirectionDeg: number;
  windGusts: number;
  updatedAt: string;
};

/** Погода напрямую с Open-Meteo (без бэкенда), чтобы работало на телефоне. Ветер в км/ч. */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherFromApi> {
  const url = new URL(OPEN_METEO);
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
  ].join(','));
  url.searchParams.set('wind_speed_unit', 'kmh');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather: ${res.status}`);
  const data = await res.json();
  const cur = data.current;
  if (!cur) throw new Error('Invalid weather response');

  return {
    temp: cur.temperature_2m,
    feelsLike: cur.apparent_temperature,
    humidity: cur.relative_humidity_2m ?? 0,
    weatherCode: cur.weather_code ?? 0,
    windSpeed: Number(cur.wind_speed_10m) ?? 0,
    windDirectionDeg: Number(cur.wind_direction_10m) ?? 0,
    windGusts: Number(cur.wind_gusts_10m) ?? Number(cur.wind_speed_10m) ?? 0,
    updatedAt: cur.time ?? new Date().toISOString(),
  };
}

export type MapObjectFromApi = {
  id: string;
  projectId: string | null;
  address: string;
  lat: number;
  lng: number;
  status: 'active' | 'done';
  createdAt: string;
  updatedAt: string;
};

export async function fetchMapObjects(status?: 'active' | 'done'): Promise<MapObjectFromApi[]> {
  const url = status ? `${MAP_OBJECTS_URL}?status=${status}` : MAP_OBJECTS_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Map objects: ${res.status}`);
  const data = await res.json();
  return data.objects ?? [];
}
