/** Widget « Weather ». */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { CloudSun, MapPin } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';

const WEATHER_CACHE_KEY = 'cozydesk.weather.cache.v1';

interface WeatherCache {
  fetchedAt: number;
  temp: number;
  wind: number;
  code: number;
}

export function WeatherWidget(): ReactNode {
  const weather = useSettingsStore((s) => s.weather);
  const [cache, setCache] = useState<WeatherCache | null>(() => {
    try {
      const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as WeatherCache) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weather) return;
    if (cache && Date.now() - cache.fetchedAt < 30 * 60_000) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weather.lat}&longitude=${weather.lon}&current=temperature_2m,wind_speed_10m,weather_code`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { current: { temperature_2m: number; wind_speed_10m: number; weather_code: number } }) => {
        const entry: WeatherCache = {
          fetchedAt: Date.now(),
          temp: data.current.temperature_2m,
          wind: data.current.wind_speed_10m,
          code: data.current.weather_code
        };
        window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
        setCache(entry);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Indisponible'));
  }, [weather, cache]);

  if (!weather) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CloudSun size={26} className="text-muted" />
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
          Météo désactivée — configurez une ville dans Paramètres (source réelle Open-Meteo).
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MapPin size={13} className="text-muted" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 650 }}>{weather.city}</span>
      </div>
      {error && (
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
          Météo indisponible ({error}). Réessai automatique.
        </div>
      )}
      {!error && cache && (
        <>
          <div className="tabular" style={{ fontSize: 'var(--text-3xl)', fontWeight: 300 }}>
            {Math.round(cache.temp)}°C
          </div>
          <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
            {weatherLabel(cache.code)} · vent {Math.round(cache.wind)} km/h
          </div>
        </>
      )}
      {!error && !cache && (
        <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
          Chargement…
        </div>
      )}
    </div>
  );
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Ciel dégagé';
  if (code <= 3) return 'Nuageux';
  if (code <= 48) return 'Brouillard';
  if (code <= 67) return 'Pluie';
  if (code <= 77) return 'Neige';
  if (code <= 82) return 'Averses';
  if (code <= 86) return 'Grésil';
  return 'Orage';
}
