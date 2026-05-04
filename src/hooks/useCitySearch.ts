import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchCities } from "@/services/geoDb";

export function useCitySearch(query: string) {
  const [debounced, setDebounced] = useState("");
  const t = useRef<number | null>(null);

  useEffect(() => {
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setDebounced(query.trim()), 400);
    return () => {
      if (t.current) window.clearTimeout(t.current);
    };
  }, [query]);

  return useQuery({
    queryKey: ["geodb", debounced],
    queryFn: ({ signal }) => searchCities(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}
