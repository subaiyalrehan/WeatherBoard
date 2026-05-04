// Open-Meteo fallback — keyless.
import type { City, Weather, HourPoint, DayPoint } from "@/types/weather";

const BASE = "https://api.open-meteo.com/v1/forecast";

// WMO weather code → normalized
const wmoToCode = (w: number): string => {
  if (w === 0) return "clear";
  if (w <= 3) return "clouds";
  if (w === 45 || w === 48) return "mist";
  if (w >= 51 && w <= 57) return "drizzle";
  if (w >= 61 && w <= 67) return "rain";
  if (w >= 71 && w <= 77) return "snow";
  if (w >= 80 && w <= 82) return "rain";
  if (w >= 85 && w <= 86) return "snow";
  if (w >= 95) return "thunderstorm";
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

interface OpenMeteoResp {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    cloud_cover: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function getOpenMeteoWeather(city: City, signal?: AbortSignal): Promise<Weather> {
  const url = new URL(BASE);
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code,is_day",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,precipitation_probability",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max,sunrise,sunset",
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = (await res.json()) as OpenMeteoResp;

  const isDay = data.current.is_day === 1;
  const code = wmoToCode(data.current.weather_code);

  // Find index of the next hour from now
  const nowMs = Date.now();
  const hourTimes = data.hourly.time.map((t) => new Date(t).getTime());
  const startIdx = Math.max(
    0,
    hourTimes.findIndex((t) => t >= nowMs),
  );

  const hourly: HourPoint[] = hourTimes
    .slice(startIdx, startIdx + 24)
    .map((t, i) => {
      const idx = startIdx + i;
      const c = wmoToCode(data.hourly.weather_code[idx]);
      const hour = new Date(t).getHours();
      const day = hour >= 6 && hour < 20;
      return {
        time: t,
        tempC: data.hourly.temperature_2m[idx],
        conditionCode: c,
        iconKey: iconKeyFor(c, day),
        precipPct: data.hourly.precipitation_probability?.[idx],
      };
    });

  const daily: DayPoint[] = data.daily.time.map((t, i) => {
    const c = wmoToCode(data.daily.weather_code[i]);
    return {
      date: new Date(t).getTime(),
      minC: data.daily.temperature_2m_min[i],
      maxC: data.daily.temperature_2m_max[i],
      conditionCode: c,
      iconKey: iconKeyFor(c, true),
      precipPct: data.daily.precipitation_probability_max?.[i],
    };
  });

  return {
    city,
    current: {
      tempC: data.current.temperature_2m,
      feelsLikeC: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.pressure_msl,
      windKph: data.current.wind_speed_10m,
      windDeg: data.current.wind_direction_10m,
      cloudPct: data.current.cloud_cover,
      conditionCode: code,
      conditionLabel: labelFor(code),
      iconKey: iconKeyFor(code, isDay),
      sunrise: data.daily.sunrise?.[0] ? new Date(data.daily.sunrise[0]).getTime() : undefined,
      sunset: data.daily.sunset?.[0] ? new Date(data.daily.sunset[0]).getTime() : undefined,
    },
    hourly,
    daily,
    fetchedAt: Date.now(),
    provider: "open-meteo",
  };
}
