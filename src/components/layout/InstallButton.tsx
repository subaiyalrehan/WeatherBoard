import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  // @ts-expect-error iOS
  if (window.navigator.standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [iOSHint, setIOSHint] = useState(false);

  useEffect(() => {
    if (isInIframe()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("WeatherBoard installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || isInIframe()) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // iOS Safari has no beforeinstallprompt — show a manual hint.
  if (isIOS && !deferred) {
    return (
      <>
        <Button variant="ghost" size="icon" aria-label="Install app" onClick={() => setIOSHint(true)}>
          <Download className="h-5 w-5" />
        </Button>
        {iOSHint && (
          <div
            role="dialog"
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4"
            onClick={() => setIOSHint(false)}
          >
            <div className="w-full max-w-sm rounded-2xl bg-card p-4 text-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="font-semibold">Install WeatherBoard</p>
              <p className="mt-1 text-muted-foreground">
                Tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.
              </p>
              <Button className="mt-3 w-full" onClick={() => setIOSHint(false)}>Got it</Button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (!deferred) return null;

  const install = async () => {
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
    } catch {
      /* ignore */
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={install} className="gap-2">
      <Download className="h-4 w-4" /> Install
    </Button>
  );
}
