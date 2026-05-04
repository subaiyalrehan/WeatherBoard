import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import type { ReactNode } from "react";

export function Header({ right }: { right?: ReactNode }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-[31] glass border-b">
      <div className="container flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            alt="WeatherBoard logo"
            className="h-9 w-9 rounded-xl shadow-card"
            width={36}
            height={36}
          />
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">WeatherBoard</h1>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Theme">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" /> Light
                {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" /> Dark
                {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" /> System
                {theme === "system" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
