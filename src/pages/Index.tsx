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
import { isOwmConfigured, owmReverseGeocode } from "@/services/openWeatherMap";
import { openMeteoReverseGeocode } from "@/services/openMeteo";
import { isGeoDbConfigured } from "@/services/geoDb";
import { Button } from "@/components/ui/button";
import { Locate, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CITY: City = {
  id: "51.508,-0.126",
  name: "London",
  country: "United Kingdom",
  lat: 51.5085,
  lon: -0.1257,
};

type GeoStatus = "idle" | "locating" | "denied" | "error";

const Index = () => {
  useTheme();
  const lastCityId = usePreferences((s) => s.lastCityId);
  const setLastCityId = usePreferences((s) => s.setLastCityId);
  const favorites = useFavorites((s) => s.favorites);
  const lastWeather = useFavorites((s) => s.lastWeather);

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
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const { data: weather, isLoading, isError, error, refetch, isFetching } = useWeather(city);

  const cachedForCity = lastWeather[city.id];
  const showCachedFallback = isError && !weather && cachedForCity;

  useEffect(() => {
    setLastCityId(city.id);
  }, [city.id, setLastCityId]);

  const useGeolocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation isn't supported in this browser.");
      setGeoStatus("error");
      return;
    }
    setGeoStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const fallbackCity: City = {
          id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
          name: "My location",
          country: "",
          lat,
          lon,
        };

        // Try OWM reverse, then Open-Meteo. Either way we still load weather.
        let resolved: { name: string; country: string; region?: string } | null = null;
        try {
          resolved = await owmReverseGeocode(lat, lon);
        } catch {
          /* fall through */
        }
        if (!resolved) {
          try {
            resolved = await openMeteoReverseGeocode(lat, lon);
          } catch {
            /* fall through */
          }
        }

        if (resolved) {
          // Build a short, readable label: "My Location (City, Region)" or "(City, Country)"
          const secondary = resolved.region || resolved.country;
          const parts = [resolved.name, secondary].filter(Boolean) as string[];
          const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
          setCity({
            ...fallbackCity,
            name: `My Location${detail}`,
            country: resolved.country,
            region: resolved.region,
          });
          toast.success(
            `Located: ${resolved.name}${resolved.country ? `, ${resolved.country}` : ""}`,
          );
        } else {
          setCity(fallbackCity);
          toast("Location found, but couldn't resolve the city name.", {
            description: "Showing weather for your coordinates.",
          });
        }
        setGeoStatus("idle");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus("denied");
          toast.error("Location access blocked", {
            description:
              "Allow location in your browser's site settings (lock icon in the address bar), then try again.",
            action: { label: "Try again", onClick: () => useGeolocation() },
            duration: 8000,
          });
        } else {
          setGeoStatus("error");
          toast.error("Couldn't get your location", {
            description: "Check your signal or GPS and retry.",
            action: { label: "Retry", onClick: () => useGeolocation() },
            duration: 6000,
          });
        }
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  };

  const missing: string[] = [];
  if (!isOwmConfigured()) missing.push("VITE_OPENWEATHERMAP_API_KEY");
  if (!isGeoDbConfigured()) missing.push("VITE_GEODB_API_KEY");

  return (
    <div className="min-h-screen">
      <Header right={<><InstallButton /><SettingsDrawer currentCity={city} /></>} />
      <OfflineBanner />

      <main className="container px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-5xl space-y-5">
          {missing.length > 0 && <MissingKeysCard missing={missing} />}

          {/* Control panel — search + my location + favorites grouped */}
          <section className="relative z-30 rounded-2xl border bg-card/60 p-4 shadow-card">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <SearchBar onSelect={setCity} />
              <Button
                variant="outline"
                className="h-12 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-card"
                onClick={useGeolocation}
                disabled={geoStatus === "locating"}
              >
                {geoStatus === "locating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locating…
                  </>
                ) : (
                  <>
                    <Locate className="mr-2 h-4 w-4" /> My location
                  </>
                )}
              </Button>
            </div>

            {/* Status conveyed via toasts + button label — keeps layout stable, no reserved space. */}

            <div className="mt-3">
              <FavoritesBar selectedId={city.id} onSelect={setCity} />
            </div>
          </section>

          {isLoading && !weather && <WeatherSkeleton />}

          {isError && !weather && !cachedForCity && (
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

          {showCachedFallback && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1">
                Showing cached data — couldn't refresh ({(error as Error)?.message ?? "network error"}).
              </span>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}

          {(weather || cachedForCity) && (
            <>
              <CurrentWeatherCard weather={(weather ?? cachedForCity)!} />
              <WeatherDetailsGrid weather={(weather ?? cachedForCity)!} />
              <HourlyForecast weather={(weather ?? cachedForCity)!} />
              <DailyForecast weather={(weather ?? cachedForCity)!} />
              {isFetching && (
                <p className="text-center text-xs text-muted-foreground">Refreshing…</p>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="container border-t border-border/60 px-4 pb-8 pt-4 text-center text-xs text-muted-foreground md:px-6">
        Made with <span aria-label="love" className="text-rose-500">♥</span> by{" "}
        <a
          href="https://subaiyalrehan.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Subaiyal Rehan
        </a>
      </footer>
    </div>
  );
};

export default Index;
