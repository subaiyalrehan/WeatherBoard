import { Settings as SettingsIcon, Bell, BellOff, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferences } from "@/store/preferencesStore";
import { useState } from "react";

export function SettingsDrawer() {
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const notificationHour = usePreferences((s) => s.notificationHourLocal);
  const setNotificationHour = usePreferences((s) => s.setNotificationHour);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
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

          <section>
            <Label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {notificationHour != null ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              Daily reminder
            </Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Choose a local time to receive a daily weather push notification.
            </p>
            <Select
              value={notificationHour != null ? String(notificationHour) : "off"}
              onValueChange={(v) =>
                setNotificationHour(v === "off" ? null : Number(v))
              }
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
            <p className="mt-2 text-xs text-muted-foreground">
              Push notifications require backend setup. We'll wire this up next.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
