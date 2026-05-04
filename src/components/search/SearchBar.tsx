import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCitySearch } from "@/hooks/useCitySearch";
import type { City } from "@/types/weather";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSelect: (city: City) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data, isFetching, error } = useCitySearch(query);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c: City) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any city…"
          className="h-12 rounded-2xl pl-10 pr-10 text-base shadow-card"
          aria-label="Search city"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-popover p-1 shadow-elevated">
          {isFetching && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {error && (
            <div className="px-3 py-3 text-sm text-destructive">
              {(error as Error).message}
            </div>
          )}
          {!isFetching && !error && data && data.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No cities found.
            </div>
          )}
          {!isFetching && data && data.length > 0 && (
            <ul className="max-h-80 overflow-auto scrollbar-thin">
              {data.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => pick(c)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left",
                      "hover:bg-accent hover:text-accent-foreground transition-colors",
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span className="flex-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[c.region, c.country].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
