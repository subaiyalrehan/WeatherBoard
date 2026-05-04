import type { Weather } from "@/types/weather";
import { usePreferences } from "@/store/preferencesStore";
import { iconForKey } from "@/lib/icons";
import { cToDisplay, formatHour, tempUnitLabel } from "@/lib/format";

export function HourlyForecast({ weather }: { weather: Weather }) {
  const units = usePreferences((s) => s.units);
  if (weather.hourly.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Hourly forecast
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {weather.hourly.map((h) => {
          const Icon = iconForKey(h.iconKey);
          return (
            <div
              key={h.time}
              className="flex min-w-[72px] flex-col items-center gap-1.5 rounded-xl bg-muted/40 px-3 py-3 transition-colors duration-150 hover:bg-accent/60"
            >
              <span className="text-xs text-muted-foreground">{formatHour(h.time)}</span>
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-semibold">
                {cToDisplay(h.tempC, units)}
                {tempUnitLabel(units)}
              </span>
              {h.precipPct != null && h.precipPct > 0 && (
                <span className="text-[10px] text-primary">{h.precipPct}%</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
