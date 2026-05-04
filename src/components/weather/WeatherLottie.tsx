import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { iconForKey } from "@/lib/icons";

// Animations are bundled in /public/lottie (Meteocons by Bas Milius, MIT).
// Filenames mirror the normalized iconKey from the weather provider layer.
const SUPPORTED = new Set([
  "clear-day",
  "clear-night",
  "partly-cloudy-day",
  "partly-cloudy-night",
  "clouds",
  "rain",
  "drizzle",
  "snow",
  "thunderstorm",
  "mist",
]);

const cache = new Map<string, unknown>();

interface Props {
  iconKey: string;
  className?: string;
  size?: number;
}

export function WeatherLottie({ iconKey, className, size = 96 }: Props) {
  const [data, setData] = useState<unknown | null>(() => cache.get(iconKey) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (cache.has(iconKey)) {
      setData(cache.get(iconKey));
      return;
    }
    if (!SUPPORTED.has(iconKey)) {
      setFailed(true);
      return;
    }

    fetch(`/lottie/${iconKey}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        cache.set(iconKey, json);
        setData(json);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [iconKey]);

  if (failed || !data) {
    const Icon = iconForKey(iconKey);
    return (
      <Icon
        className={className}
        style={{ width: size, height: size }}
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={iconKey.replace(/-/g, " ")}
    >
      <Lottie
        animationData={data}
        loop
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}
