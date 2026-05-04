// Format helpers for units and times.
import type { Units } from "@/types/weather";

export const cToDisplay = (c: number, units: Units) =>
  units === "metric" ? Math.round(c) : Math.round(c * 9 / 5 + 32);

export const tempUnitLabel = (units: Units) => (units === "metric" ? "°C" : "°F");

export const kphToDisplay = (kph: number, units: Units) =>
  units === "metric" ? Math.round(kph) : Math.round(kph * 0.621371);

export const speedUnitLabel = (units: Units) => (units === "metric" ? "km/h" : "mph");

export const formatHour = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric" });

export const formatDay = (ts: number) =>
  new Date(ts).toLocaleDateString([], { weekday: "short" });

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const formatRelative = (ts: number) => {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
