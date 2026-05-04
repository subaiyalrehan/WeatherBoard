import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeMode, Units } from "@/types/weather";

interface PreferencesState {
  units: Units;
  theme: ThemeMode;
  lastCityId: string | null;
  notificationHourLocal: number | null; // 0-23, user's local hour
  pushEndpoint: string | null;
  setUnits: (u: Units) => void;
  setTheme: (t: ThemeMode) => void;
  setLastCityId: (id: string | null) => void;
  setNotificationHour: (h: number | null) => void;
  setPushEndpoint: (e: string | null) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      units: "metric",
      theme: "system",
      lastCityId: null,
      notificationHourLocal: null,
      pushEndpoint: null,
      setUnits: (units) => set({ units }),
      setTheme: (theme) => set({ theme }),
      setLastCityId: (lastCityId) => set({ lastCityId }),
      setNotificationHour: (notificationHourLocal) => set({ notificationHourLocal }),
      setPushEndpoint: (pushEndpoint) => set({ pushEndpoint }),
    }),
    { name: "wb.preferences" },
  ),
);
