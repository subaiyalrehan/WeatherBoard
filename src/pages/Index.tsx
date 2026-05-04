import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { MissingKeysCard } from "@/components/layout/MissingKeysCard";
import { SearchBar } from "@/components/search/SearchBar";
import { FavoritesBar } from "@/components/favorites/FavoritesBar";
import { CurrentWeatherCard } from "@/components/weather/CurrentWeatherCard";
import { WeatherDetailsGrid } from "@/components/weather/WeatherDetailsGrid";
import { HourlyForecast } from "@/components/weather/HourlyForecast";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { WeatherSkeleton } from "@/components/weather/WeatherSkeleton";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { useWeather } from "@/hooks/useWeather";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/store/preferencesStore";
import { useFavorites } from "@/store/favoritesStore";
import type { City } from "@/types/weather";
import { isOwmConfigured } from "@/services/openWeatherMap";
import { isGeoDbConfigured } from "@/services/geoDb";
import { Button } from "@/components/ui/button";
import { Locate, AlertCircle, RefreshCw } from "lucide-react";

const DEFAULT_CITY: City = {
  id: "51.508,-0.126",
  name: "London",
  country: "United Kingdom",
  lat: 51.5085,
  lon: -0.1257,
};

const Index = () => {
  useTheme(); // applies html.dark
  const lastCityId = usePreferences((s) => s.lastCityId);
  const setLastCityId = usePreferences((s) => s.setLastCityId);
  const favorites = useFavorites((s) => s.favorites);
  const lastWeather = useFavorites((s) => s.lastWeather);

  // Resolve initial city: lastCityId → first favorite → cached lastWeather → default
  const initialCity = useMemo<City>(() => {
    if (lastCityId) {
      const fav = favorites.find((f) => f.id === lastCityId);
      if (fav) return fav;
      const cached = lastWeather[lastCityId];
      if (cached) return cached.city;
    }
    if (favorites[0]) return favorites[0];
    const anyCached = Object.values(lastWeather)[0];
    if (anyCached) return anyCached.city;
    return DEFAULT_CITY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [city, setCity] = useState<City>(initialCity);
  const { data: weather, isLoading, isError, error, refetch, isFetching } = useWeather(city);

  useEffect(() => {
    setLastCityId(city.id);
  }, [city.id, setLastCityId]);

  const useGeolocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: City = {
          id: `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`,
          name: "My location",
          country: "",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setCity(c);
      },
      () => {
        /* denied — silently ignore */
      },
      { timeout: 8000 },
    );
  };

  const missing: string[] = [];
  if (!isOwmConfigured()) missing.push("VITE_OPENWEATHERMAP_API_KEY");
  if (!isGeoDbConfigured()) missing.push("VITE_GEODB_API_KEY");

  return (
    <div className="min-h-screen">
      <Header right={<SettingsDrawer />} />
      <OfflineBanner />

      <main className="container px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {missing.length > 0 && <MissingKeysCard missing={missing} />}

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <SearchBar onSelect={setCity} />
            <Button
              variant="outline"
              className="h-12 rounded-2xl"
              onClick={useGeolocation}
            >
              <Locate className="mr-2 h-4 w-4" /> My location
            </Button>
          </div>

          <FavoritesBar selectedId={city.id} onSelect={setCity} />

          {isLoading && !weather && <WeatherSkeleton />}

          {isError && !weather && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
              <p className="font-medium">Could not load weather</p>
              <p className="mb-3 text-sm text-muted-foreground">
                {(error as Error)?.message ?? "Please try again."}
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {weather && (
            <>
              <CurrentWeatherCard weather={weather} />
              <WeatherDetailsGrid weather={weather} />
              <HourlyForecast weather={weather} />
              <DailyForecast weather={weather} />
              {isFetching && (
                <p className="text-center text-xs text-muted-foreground">Refreshing…</p>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="container px-4 pb-8 pt-4 text-center text-xs text-muted-foreground md:px-6">
        Data: OpenWeatherMap · Open-Meteo · GeoDB Cities
      </footer>
    </div>
  );
};

export default Index;
