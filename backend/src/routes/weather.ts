import { Router, Request, Response } from 'express';

const router = Router();
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

/** Погода по координатам (Open-Meteo). Ветер в км/ч, направление в градусах (откуда дует). */
router.get('/', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'Query params lat and lng (numbers) required' });
  }

  try {
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

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      return res.status(502).json({ error: 'Weather service unavailable' });
    }
    const data: any = await resp.json();
    const cur = data.current;
    if (!cur) {
      return res.status(502).json({ error: 'Invalid weather response' });
    }

    res.json({
      temp: cur.temperature_2m,
      feelsLike: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      weatherCode: cur.weather_code,
      windSpeed: cur.wind_speed_10m ?? 0,
      windDirectionDeg: cur.wind_direction_10m ?? 0,
      windGusts: cur.wind_gusts_10m ?? cur.wind_speed_10m ?? 0,
      updatedAt: cur.time,
    });
  } catch (e) {
    console.error('Weather fetch error', e);
    res.status(502).json({ error: 'Weather fetch failed' });
  }
});

export default router;
