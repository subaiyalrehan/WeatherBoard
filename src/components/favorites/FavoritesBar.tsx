import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/store/favoritesStore";
import { cn } from "@/lib/utils";
import type { City } from "@/types/weather";

interface FavoritesBarProps {
  selectedId?: string;
  onSelect: (city: City) => void;
}

export function FavoritesBar({ selectedId, onSelect }: FavoritesBarProps) {
  const favorites = useFavorites((s) => s.favorites);
  const remove = useFavorites((s) => s.remove);

  if (favorites.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Star className="h-4 w-4" />
        <span>
          Add up to 5 favorite cities for quick access.
          <span className="ml-1 opacity-80">Search a city, then tap ★ Save.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {favorites.map((c) => {
        const active = c.id === selectedId;
        return (
          <div
            key={c.id}
            className={cn(
              "group flex shrink-0 items-center rounded-full border bg-card pl-3 pr-1 shadow-card transition-all duration-200",
              active
                ? "border-primary/50 bg-accent text-accent-foreground"
                : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated",
            )}
          >
            <button
              onClick={() => onSelect(c)}
              className="flex items-center gap-2 py-1.5 text-sm font-medium"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  active ? "fill-current text-primary" : "text-primary",
                )}
              />
              {c.name}
              <span className="text-xs text-muted-foreground">{c.country}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-7 w-7 rounded-full opacity-60 hover:opacity-100"
              onClick={() => remove(c.id)}
              aria-label={`Remove ${c.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
