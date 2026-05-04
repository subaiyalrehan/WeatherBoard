import { Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherLottie } from "@/components/weather/WeatherLottie";
import { cToDisplay, formatRelative, tempUnitLabel } from "@/lib/format";
import { useFavorites, MAX_FAVORITES } from "@/store/favoritesStore";
import { usePreferences } from "@/store/preferencesStore";
import { useToast } from "@/hooks/use-toast";
import type { Weather } from "@/types/weather";

export function CurrentWeatherCard({ weather }: { weather: Weather }) {
  const units = usePreferences((s) => s.units);
  const { add, remove, has } = useFavorites();
  const isFav = has(weather.city.id);
  const { toast } = useToast();

  const toggleFav = () => {
    if (isFav) {
      remove(weather.city.id);
      toast({ title: "Removed from favorites", description: weather.city.name });
    } else {
      const r = add(weather.city);
      if (!r.ok) toast({ title: "Limit reached", description: r.reason, variant: "destructive" });
      else toast({ title: "Saved to favorites", description: `${weather.city.name} (${MAX_FAVORITES} max)` });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-sky p-6 text-[hsl(var(--hero-foreground))] shadow-elevated ring-1 ring-white/10 md:p-8">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm/none font-medium">
            <MapPin className="h-3.5 w-3.5" />
            {weather.city.name}
            <span className="opacity-90">
              {[weather.city.region, weather.city.country].filter(Boolean).join(", ")}
            </span>
          </div>
          <div className="mt-1 text-xs opacity-90">
            Updated {formatRelative(weather.fetchedAt)} · via{" "}
            {weather.provider === "openweathermap" ? "OpenWeatherMap" : "Open-Meteo"}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFav}
          className="rounded-full bg-white/20 text-[hsl(var(--hero-foreground))] backdrop-blur-sm hover:bg-white/30 hover:text-[hsl(var(--hero-foreground))]"
        >
          <Star className={`mr-1.5 h-4 w-4 ${isFav ? "fill-current" : ""}`} />
          {isFav ? "Saved" : "Save"}
        </Button>
      </div>

      <div className="relative mt-6 flex items-end gap-6">
        <WeatherLottie
          iconKey={weather.current.iconKey}
          className="drop-shadow-lg"
          size={112}
        />
        <div>
          <div className="text-6xl font-bold leading-none tracking-tight drop-shadow-md md:text-7xl">
            {cToDisplay(weather.current.tempC, units)}
            <span className="text-3xl font-semibold opacity-90 md:text-4xl">
              {tempUnitLabel(units)}
            </span>
          </div>
          <div className="mt-1 text-lg font-medium opacity-95 drop-shadow-sm">
            {weather.current.conditionLabel} · feels like{" "}
            {cToDisplay(weather.current.feelsLikeC, units)}
            {tempUnitLabel(units)}
          </div>
        </div>
      </div>
    </div>
  );
}
