import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Loader2, MapPin, Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCitySearch } from "@/hooks/useCitySearch";
import { useRecentSearches, POPULAR_CITIES } from "@/store/recentSearchesStore";
import type { City } from "@/types/weather";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSelect: (city: City) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data, isFetching, error } = useCitySearch(query);

  const recents = useRecentSearches((s) => s.recents);
  const pushRecent = useRecentSearches((s) => s.push);
  const clearRecents = useRecentSearches((s) => s.clear);

  const showSuggestions = query.trim().length === 0;
  const suggestionList: City[] = useMemo(() => {
    if (!showSuggestions) return [];
    return recents.length > 0 ? recents : POPULAR_CITIES;
  }, [showSuggestions, recents]);

  const visibleResults: City[] = showSuggestions ? suggestionList : data ?? [];

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c: City) => {
    onSelect(c);
    pushRecent(c);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, visibleResults.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const c = visibleResults[activeIdx];
      if (c) {
        e.preventDefault();
        pick(c);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
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
          onKeyDown={onKeyDown}
          placeholder="Search any city…"
          className="h-12 rounded-2xl pl-10 pr-10 text-base shadow-card transition-shadow focus-visible:shadow-elevated"
          aria-label="Search city"
          aria-autocomplete="list"
          aria-expanded={open}
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

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 w-full rounded-2xl border bg-popover p-1 shadow-elevated">
          {showSuggestions && (
            <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {recents.length > 0 ? (
                  <>
                    <Clock className="h-3 w-3" /> Recent
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Popular cities
                  </>
                )}
              </span>
              {recents.length > 0 && (
                <button
                  onClick={() => clearRecents()}
                  className="text-[10px] normal-case tracking-normal text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {!showSuggestions && isFetching && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}
          {!showSuggestions && error && (
            <div className="px-3 py-3 text-sm text-destructive">
              {(error as Error).message}
            </div>
          )}
          {!showSuggestions && !isFetching && !error && data && data.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No cities found for “{query.trim()}”.
            </div>
          )}

          {visibleResults.length > 0 && (
            <ul className="max-h-80 overflow-auto scrollbar-thin">
              {visibleResults.map((c, i) => (
                <li key={c.id}>
                  <button
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pick(c)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150",
                      i === activeIdx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
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

          <div className="mt-1 flex items-center justify-between border-t px-3 py-1.5 text-[10px] text-muted-foreground">
            <span>↑↓ navigate · ↵ select · Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
