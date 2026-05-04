import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="border-b border-amber-300/40 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="container flex items-center gap-2 px-4 py-2 text-sm md:px-6">
        <WifiOff className="h-4 w-4" />
        You're offline — showing the last cached weather.
      </div>
    </div>
  );
}
