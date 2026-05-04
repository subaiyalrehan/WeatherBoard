// OpenWeatherMap provider — uses free /data/2.5/weather + /data/2.5/forecast (5-day/3-hour).
import type { City, Weather, HourPoint, DayPoint } from "@/types/weather";

const API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY as string | undefined;
const BASE = "https://api.openweathermap.org/data/2.5";

export const isOwmConfigured = () => Boolean(API_KEY);

interface OwmCurrent {
  weather: { id: number; main: string; description: string }[];
  main: { temp: number; feels_like: number; humidity: number; pressure: number };
  wind: { speed: number; deg: number };
  clouds?: { all: number };
  visibility?: number;
  sys: { sunrise: number; sunset: number };
  dt: number;
}

interface OwmForecastEntry {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number };
  weather: { id: number; main: string; description: string }[];
  pop?: number;
}

const owmMainToCode = (main: string): string => {
  const m = main.toLowerCase();
  if (m === "clear") return "clear";
  if (m === "clouds") return "clouds";
  if (m === "rain") return "rain";
  if (m === "drizzle") return "drizzle";
  if (m === "snow") return "snow";
  if (m === "thunderstorm") return "thunderstorm";
  if (["mist", "fog", "haze", "smoke"].includes(m)) return "mist";
  return "unknown";
};

const iconKeyFor = (code: string, isDay: boolean): string => {
  if (code === "clear") return isDay ? "clear-day" : "clear-night";
  if (code === "clouds") return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
  return code;
};

const labelFor = (code: string): string =>
  ({
    clear: "Clear",
    clouds: "Cloudy",
    rain: "Rain",
    drizzle: "Drizzle",
    snow: "Snow",
    thunderstorm: "Thunderstorm",
    mist: "Mist",
    unknown: "Unknown",
  } as Record<string, string>)[code] ?? "Unknown";

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OpenWeatherMap ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getOwmWeather(city: City, signal?: AbortSignal): Promise<Weather> {
  if (!API_KEY) throw new Error("OWM key missing");

  const params = `lat=${city.lat}&lon=${city.lon}&units=metric&appid=${API_KEY}`;
  const [cur, fc] = await Promise.all([
    fetchJson<OwmCurrent>(`${BASE}/weather?${params}`, signal),
    fetchJson<{ list: OwmForecastEntry[] }>(`${BASE}/forecast?${params}`, signal),
  ]);

  const isDay = Date.now() / 1000 > cur.sys.sunrise && Date.now() / 1000 < cur.sys.sunset;
  const code = owmMainToCode(cur.weather[0]?.main ?? "");

  const hourly: HourPoint[] = fc.list.slice(0, 8).map((e) => {
    const c = owmMainToCode(e.weather[0]?.main ?? "");
    const day = (e.dt * 1000) % 86400000 > 21600000 && (e.dt * 1000) % 86400000 < 75600000;
    return {
      time: e.dt * 1000,
      tempC: e.main.temp,
      conditionCode: c,
      iconKey: iconKeyFor(c, day),
      precipPct: e.pop != null ? Math.round(e.pop * 100) : undefined,
    };
  });

  // Aggregate 3-hour entries into daily min/max.
  const buckets = new Map<string, OwmForecastEntry[]>();
  for (const e of fc.list) {
    const d = new Date(e.dt * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }
  const daily: DayPoint[] = Array.from(buckets.entries())
    .slice(0, 7)
    .map(([, items]) => {
      const minC = Math.min(...items.map((i) => i.main.temp_min));
      const maxC = Math.max(...items.map((i) => i.main.temp_max));
      // pick midday entry as representative condition
      const mid =
        items.find((i) => new Date(i.dt * 1000).getHours() >= 12) ?? items[0];
      const c = owmMainToCode(mid.weather[0]?.main ?? "");
      const pop = Math.max(...items.map((i) => i.pop ?? 0));
      const d = new Date(items[0].dt * 1000);
      d.setHours(0, 0, 0, 0);
      return {
        date: d.getTime(),
        minC,
        maxC,
        conditionCode: c,
        iconKey: iconKeyFor(c, true),
        precipPct: Math.round(pop * 100),
      };
    });

  return {
    city,
    current: {
      tempC: cur.main.temp,
      feelsLikeC: cur.main.feels_like,
      humidity: cur.main.humidity,
      pressure: cur.main.pressure,
      windKph: cur.wind.speed * 3.6,
      windDeg: cur.wind.deg,
      cloudPct: cur.clouds?.all,
      visibilityKm: cur.visibility != null ? cur.visibility / 1000 : undefined,
      conditionCode: code,
      conditionLabel: labelFor(code),
      iconKey: iconKeyFor(code, isDay),
      sunrise: cur.sys.sunrise * 1000,
      sunset: cur.sys.sunset * 1000,
    },
    hourly,
    daily,
    fetchedAt: Date.now(),
    provider: "openweathermap",
  };
}

interface OwmReverseEntry {
  name: string;
  country: string;
  state?: string;
  local_names?: Record<string, string>;
}

export async function owmReverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<{ name: string; country: string; region?: string } | null> {
  if (!API_KEY) return null;
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OWM reverse ${res.status}`);
  const list = (await res.json()) as OwmReverseEntry[];
  const e = list[0];
  if (!e) return null;
  return { name: e.name, country: e.country, region: e.state };
}
