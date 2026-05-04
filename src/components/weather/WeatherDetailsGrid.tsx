import { Droplets, Wind, Gauge, Eye, Sunrise, Sunset, Cloud } from "lucide-react";
import type { Weather } from "@/types/weather";
import { usePreferences } from "@/store/preferencesStore";
import { formatTime, kphToDisplay, speedUnitLabel } from "@/lib/format";

function Tile({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <div className="rounded-2xl border hover:border-primary hover:bg-accent/60 bg-card p-4 shadow-card transition-all">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

export function WeatherDetailsGrid({ weather }: { weather: Weather }) {
  const units = usePreferences((s) => s.units);
  const c = weather.current;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <Tile icon={Droplets} label="Humidity" value={`${c.humidity}%`} />
      <Tile icon={Wind} label="Wind" value={`${kphToDisplay(c.windKph, units)} ${speedUnitLabel(units)}`} />
      <Tile icon={Gauge} label="Pressure" value={`${Math.round(c.pressure)} hPa`} />
      {c.cloudPct != null && <Tile icon={Cloud} label="Cloud cover" value={`${c.cloudPct}%`} />}
      {c.visibilityKm != null && <Tile icon={Eye} label="Visibility" value={`${c.visibilityKm.toFixed(1)} km`} />}
      {c.sunrise && <Tile icon={Sunrise} label="Sunrise" value={formatTime(c.sunrise)} />}
      {c.sunset && <Tile icon={Sunset} label="Sunset" value={formatTime(c.sunset)} />}
    </div>
  );
}
