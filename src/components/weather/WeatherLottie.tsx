import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { iconForKey } from "@/lib/icons";

// Public Lottie animation URLs (LottieFiles CDN — free, hotlinkable JSON).
// Mapped per normalized iconKey produced by the weather provider layer.
const LOTTIE_MAP: Record<string, string> = {
  "clear-day": "https://lottie.host/4d42d6cb-8a98-4f43-bc1f-7c6a1e76b3e5/p1z3LJh7gE.json",
  "clear-night": "https://lottie.host/3d49af2b-6f8b-4ea7-9e2f-0b5e0c7c2a4d/0bWbN2QkX9.json",
  "partly-cloudy-day": "https://lottie.host/5b1a8e16-2f4f-4f3e-9b46-7d2b6f8c0c5a/cLqQqEJqmT.json",
  "partly-cloudy-night": "https://lottie.host/9f3a4d4c-7c73-4e3a-9f3b-2b6e1f8d3c5e/8h7m3KQ0lN.json",
  clouds: "https://lottie.host/7a9d2e3f-9c4d-4f2a-bb19-2cd9b6e8f3a1/qZ3rT0p9Lx.json",
  rain: "https://lottie.host/7a3a2e9b-d11f-4d78-9a3a-2f5d2b1c4d6e/0fR9bqQp0o.json",
  drizzle: "https://lottie.host/7a3a2e9b-d11f-4d78-9a3a-2f5d2b1c4d6e/0fR9bqQp0o.json",
  snow: "https://lottie.host/8b6e9c2d-3f4a-4e5b-9c1d-2e3f4a5b6c7d/snowAnim.json",
  thunderstorm: "https://lottie.host/8c7d2f3e-4b5c-4d6e-9f1a-2b3c4d5e6f7a/thunder.json",
  mist: "https://lottie.host/9d8e3f4a-5b6c-4d7e-8f9a-1b2c3d4e5f6a/mist.json",
};

// In-memory cache so we don't refetch the same animation across mounts.
const cache = new Map<string, unknown>();

interface Props {
  iconKey: string;
  className?: string;
  size?: number;
}

export function WeatherLottie({ iconKey, className, size = 96 }: Props) {
  const [data, setData] = useState<unknown | null>(() => cache.get(iconKey) ?? null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (cache.has(iconKey)) {
      setData(cache.get(iconKey));
      return;
    }

    const url = LOTTIE_MAP[iconKey];
    if (!url) {
      setFailed(true);
      return;
    }

    fetch(url)
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
        lottieRef={ref}
        animationData={data}
        loop
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}
