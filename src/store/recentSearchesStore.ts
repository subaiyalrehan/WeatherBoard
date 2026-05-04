import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { City } from "@/types/weather";

const MAX_RECENT = 5;

interface RecentSearchesState {
  recents: City[];
  push: (city: City) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set, get) => ({
      recents: [],
      push: (city) => {
        const next = [city, ...get().recents.filter((c) => c.id !== city.id)].slice(
          0,
          MAX_RECENT,
        );
        set({ recents: next });
      },
      clear: () => set({ recents: [] }),
    }),
    { name: "wb.recents" },
  ),
);

export const POPULAR_CITIES: City[] = [
  { id: "51.508,-0.126", name: "London", country: "United Kingdom", lat: 51.5085, lon: -0.1257 },
  { id: "40.713,-74.006", name: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
  { id: "35.690,139.692", name: "Tokyo", country: "Japan", lat: 35.6895, lon: 139.6917 },
  { id: "48.857,2.353", name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { id: "-33.869,151.209", name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { id: "25.205,55.271", name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
  { id: "1.352,103.820", name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  { id: "37.775,-122.419", name: "San Francisco", country: "United States", lat: 37.7749, lon: -122.4194 },
];
