// GeoDB Cities API (RapidAPI) — city autocomplete.
import type { City } from "@/types/weather";

const API_KEY = import.meta.env.VITE_GEODB_API_KEY as string | undefined;
const HOST = "wft-geo-db.p.rapidapi.com";
const BASE = `https://${HOST}/v1/geo/cities`;

export const isGeoDbConfigured = () => Boolean(API_KEY);

export interface GeoDbCity {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  latitude: number;
  longitude: number;
}

const toCity = (g: GeoDbCity): City => ({
  id: `${g.latitude.toFixed(3)},${g.longitude.toFixed(3)}`,
  name: g.name,
  country: g.country,
  region: g.region,
  lat: g.latitude,
  lon: g.longitude,
});

export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  if (!query.trim()) return [];
  if (!API_KEY) throw new Error("GeoDB API key missing. Set VITE_GEODB_API_KEY in .env");

  const url = new URL(BASE);
  url.searchParams.set("namePrefix", query.trim());
  url.searchParams.set("limit", "8");
  url.searchParams.set("sort", "-population");
  url.searchParams.set("types", "CITY");

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": HOST,
    },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("GeoDB rate limit reached. Please slow down.");
    throw new Error(`GeoDB error ${res.status}`);
  }
  const json = (await res.json()) as { data?: GeoDbCity[] };
  return (json.data ?? []).map(toCity);
}
