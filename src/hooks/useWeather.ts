import { useQuery } from "@tanstack/react-query";
import type { City, Weather } from "@/types/weather";
import { getWeather } from "@/services/weatherProvider";
import { useFavorites } from "@/store/favoritesStore";
import { useEffect } from "react";

export function useWeather(city: City | null) {
  const cacheWeather = useFavorites((s) => s.cacheWeather);
  const lastWeather = useFavorites((s) => s.lastWeather);

  const query = useQuery<Weather>({
    queryKey: ["weather", city?.id],
    queryFn: ({ signal }) => getWeather(city!, signal),
    enabled: Boolean(city),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    initialData: city ? lastWeather[city.id] : undefined,
  });

  useEffect(() => {
    if (query.data) cacheWeather(query.data);
  }, [query.data, cacheWeather]);

  return query;
}
