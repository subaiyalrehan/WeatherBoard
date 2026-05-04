// Normalized weather types — provider-agnostic UI consumes only these.

export type Units = "metric" | "imperial";
export type ThemeMode = "light" | "dark" | "system";

export interface City {
  id: string; // stable id: `${lat.toFixed(3)},${lon.toFixed(3)}`
  name: string;
  country: string;
  region?: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  humidity: number; // %
  pressure: number; // hPa
  windKph: number;
  windDeg: number;
  uvIndex?: number;
  cloudPct?: number;
  visibilityKm?: number;
  conditionCode: string; // normalized: "clear" | "clouds" | "rain" | "snow" | "thunderstorm" | "drizzle" | "mist" | "unknown"
  conditionLabel: string;
  iconKey: string; // maps to lucide icon
  sunrise?: number; // unix ms
  sunset?: number; // unix ms
}

export interface HourPoint {
  time: number; // unix ms
  tempC: number;
  conditionCode: string;
  iconKey: string;
  precipPct?: number;
}

export interface DayPoint {
  date: number; // unix ms (start of day, local)
  minC: number;
  maxC: number;
  conditionCode: string;
  iconKey: string;
  precipPct?: number;
}

export interface Weather {
  city: City;
  current: CurrentWeather;
  hourly: HourPoint[]; // next ~24
  daily: DayPoint[]; // next 7
  fetchedAt: number; // unix ms
  provider: "openweathermap" | "open-meteo";
}
