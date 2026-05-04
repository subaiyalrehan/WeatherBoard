// Orchestrator: try OpenWeatherMap first, fall back to Open-Meteo on failure.
import type { City, Weather } from "@/types/weather";
import { getOwmWeather, isOwmConfigured } from "./openWeatherMap";
import { getOpenMeteoWeather } from "./openMeteo";

export async function getWeather(city: City, signal?: AbortSignal): Promise<Weather> {
  if (isOwmConfigured()) {
    try {
      return await getOwmWeather(city, signal);
    } catch (err) {
      // Silent fallback — log for debugging only
      console.warn("[weatherProvider] OWM failed, falling back to Open-Meteo:", err);
    }
  }
  return getOpenMeteoWeather(city, signal);
}
