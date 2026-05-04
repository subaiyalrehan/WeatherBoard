import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { City, Weather } from "@/types/weather";

const MAX_FAVORITES = 5;

interface FavoritesState {
  favorites: City[];
  /** Last weather snapshot per city id — used for offline rehydration. */
  lastWeather: Record<string, Weather>;
  add: (city: City) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  has: (id: string) => boolean;
  cacheWeather: (w: Weather) => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      lastWeather: {},
      add: (city) => {
        const { favorites } = get();
        if (favorites.some((f) => f.id === city.id)) return { ok: true };
        if (favorites.length >= MAX_FAVORITES) {
          return { ok: false, reason: `You can save up to ${MAX_FAVORITES} cities.` };
        }
        set({ favorites: [...favorites, city] });
        return { ok: true };
      },
      remove: (id) =>
        set((s) => ({
          favorites: s.favorites.filter((f) => f.id !== id),
        })),
      has: (id) => get().favorites.some((f) => f.id === id),
      cacheWeather: (w) =>
        set((s) => ({ lastWeather: { ...s.lastWeather, [w.city.id]: w } })),
    }),
    { name: "wb.favorites" },
  ),
);

export { MAX_FAVORITES };
