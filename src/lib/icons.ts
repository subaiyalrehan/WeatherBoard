// Map normalized condition codes to lucide-react icon names.
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  type LucideIcon,
} from "lucide-react";

export const iconForKey = (key: string): LucideIcon => {
  switch (key) {
    case "clear-day":
      return Sun;
    case "clear-night":
      return Moon;
    case "partly-cloudy-day":
      return CloudSun;
    case "partly-cloudy-night":
      return CloudMoon;
    case "clouds":
      return Cloud;
    case "rain":
      return CloudRain;
    case "drizzle":
      return CloudDrizzle;
    case "snow":
      return CloudSnow;
    case "thunderstorm":
      return CloudLightning;
    case "mist":
      return CloudFog;
    default:
      return Cloud;
  }
};
