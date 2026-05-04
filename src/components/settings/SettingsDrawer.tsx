import { Settings as SettingsIcon, Bell, BellOff, Thermometer, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferences } from "@/store/preferencesStore";
import { useEffect, useState } from "react";
import {
  getPushSupport,
  getActiveSubscription,
  requestPermission,
  syncSubscription,
  unsubscribePush,
  sendTestNotification,
} from "@/services/push";
import type { City } from "@/types/weather";
import { toast } from "sonner";

interface SettingsDrawerProps {
  currentCity?: City | null;
}

export function SettingsDrawer({ currentCity = null }: SettingsDrawerProps) {
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const notificationHour = usePreferences((s) => s.notificationHourLocal);
  const setNotificationHour = usePreferences((s) => s.setNotificationHour);
  const setPushEndpoint = usePreferences((s) => s.setPushEndpoint);
  const [open, setOpen] = useState(false);

  const [support] = useState(() => getPushSupport());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState<null | "enable" | "disable" | "test" | "save">(null);
  const [severeEnabled, setSevereEnabled] = useState(true);

  useEffect(() => {
    if (!support.supported) return;
    let cancelled = false;
    getActiveSubscription().then((s) => {
      if (!cancelled) setSubscribed(!!s);
    });
    return () => {
      cancelled = true;
    };
  }, [support.supported]);

  const enableNotifications = async () => {
    if (!support.supported) return;
    setBusy("enable");
    try {
      const perm = await requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notifications blocked", {
          description:
            "Allow notifications in your browser's site settings (lock icon in the address bar) and try again.",
        });
        return;
      }
      const sub = await syncSubscription({
        city: currentCity,
        units,
        notificationHour,
        dailyEnabled: notificationHour != null,
        severeEnabled,
      });
      setPushEndpoint(sub.endpoint);
      setSubscribed(true);
      toast.success("Notifications enabled");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't enable notifications", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const disableNotifications = async () => {
    setBusy("disable");
    try {
      await unsubscribePush();
      setPushEndpoint(null);
      setSubscribed(false);
      toast.success("Notifications disabled");
    } catch (e) {
      toast.error("Couldn't disable notifications", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      await sendTestNotification();
      toast.success("Test push sent — check your notifications");
    } catch (e) {
      toast.error("Test failed", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  // Re-sync server when prefs change while subscribed
  const savePrefs = async (next: { notificationHour?: number | null; severeEnabled?: boolean }) => {
    if (!subscribed) return;
    setBusy("save");
    try {
      await syncSubscription({
        city: currentCity,
        units,
        notificationHour: next.notificationHour ?? notificationHour,
        dailyEnabled: (next.notificationHour ?? notificationHour) != null,
        severeEnabled: next.severeEnabled ?? severeEnabled,
      });
    } catch (e) {
      toast.error("Couldn't save preferences", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Personalize WeatherBoard.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <Label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Thermometer className="h-4 w-4" /> Units
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">°F</span>
              <Switch
                checked={units === "metric"}
                onCheckedChange={(v) => setUnits(v ? "metric" : "imperial")}
                aria-label="Toggle units"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card/40 p-4">
            <div className="flex items-center gap-2">
              {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              <Label className="text-sm font-semibold">Notifications</Label>
            </div>

            {!support.supported ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{(support as { supported: false; reason: string }).reason}</span>
              </div>
            ) : inIframe ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Push notifications can't be enabled inside the editor preview. Publish your app and open it in a new
                  tab to enable them.
                </span>
              </div>
            ) : (
              <>
                {!subscribed ? (
                  <Button className="w-full" onClick={enableNotifications} disabled={busy === "enable"}>
                    {busy === "enable" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enabling…
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" /> Enable notifications
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={sendTest} disabled={busy === "test"}>
                      {busy === "test" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Test
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={disableNotifications} disabled={busy === "disable"}>
                      {busy === "disable" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> …
                        </>
                      ) : (
                        <>
                          <BellOff className="mr-2 h-4 w-4" /> Disable
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {permission === "denied" && (
                  <p className="text-xs text-muted-foreground">
                    Notifications are blocked in your browser. Allow them in site settings to enable.
                  </p>
                )}

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-medium">Daily forecast time</Label>
                  <Select
                    value={notificationHour != null ? String(notificationHour) : "off"}
                    onValueChange={(v) => {
                      const next = v === "off" ? null : Number(v);
                      setNotificationHour(next);
                      void savePrefs({ notificationHour: next });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      {Array.from({ length: 24 }).map((_, h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs font-medium">Severe weather alerts</Label>
                  <Switch
                    checked={severeEnabled}
                    onCheckedChange={(v) => {
                      setSevereEnabled(v);
                      void savePrefs({ severeEnabled: v });
                    }}
                    aria-label="Toggle severe weather alerts"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
