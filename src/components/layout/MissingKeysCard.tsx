import { AlertTriangle } from "lucide-react";

export function MissingKeysCard({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900 shadow-card dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" /> Setup required
      </div>
      <p className="mb-2">
        Add the following key{missing.length > 1 ? "s" : ""} to your{" "}
        <code className="rounded bg-amber-200/60 px-1 py-0.5 dark:bg-amber-900/60">.env</code>{" "}
        file, then refresh:
      </p>
      <ul className="ml-4 list-disc space-y-1">
        {missing.map((k) => (
          <li key={k}>
            <code>{k}</code>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/70">
        Open-Meteo will be used as a fallback so the app still works without the OpenWeatherMap key.
      </p>
    </div>
  );
}
