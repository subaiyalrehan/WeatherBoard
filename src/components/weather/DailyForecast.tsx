import type { Weather } from "@/types/weather";
import { usePreferences } from "@/store/preferencesStore";
import { iconForKey } from "@/lib/icons";
import { cToDisplay, formatDay, tempUnitLabel } from "@/lib/format";

export function DailyForecast({ weather }: { weather: Weather }) {
  const units = usePreferences((s) => s.units);
  if (weather.daily.length === 0) return null;

  const allMin = Math.min(...weather.daily.map((d) => d.minC));
  const allMax = Math.max(...weather.daily.map((d) => d.maxC));
  const range = Math.max(1, allMax - allMin);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        7-day forecast
      </h2>
      <ul className="divide-y">
        {weather.daily.map((d, i) => {
          const Icon = iconForKey(d.iconKey);
          const left = ((d.minC - allMin) / range) * 100;
          const right = ((allMax - d.maxC) / range) * 100;
          return (
            <li key={d.date} className="flex items-center gap-3 py-2.5">
              <span className="w-12 shrink-0 text-sm font-medium">
                {i === 0 ? "Today" : formatDay(d.date)}
              </span>
              <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
              <span className="w-10 shrink-0 text-right text-sm text-muted-foreground">
                {cToDisplay(d.minC, units)}°
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute h-full rounded-full bg-gradient-sky"
                  style={{ left: `${left}%`, right: `${right}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-sm font-semibold">
                {cToDisplay(d.maxC, units)}°
              </span>
              {d.precipPct != null && d.precipPct > 0 && (
                <span className="hidden w-10 shrink-0 text-right text-xs text-primary md:inline">
                  {d.precipPct}%
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sr-only">Unit: {tempUnitLabel(units)}</p>
    </section>
  );
}
