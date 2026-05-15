import { useQuery } from '@tanstack/react-query'
import { fetchStop, fetchStops } from '../services/stops'

export function useStops() {
  return useQuery({
    queryKey: ['stops'],
    queryFn: fetchStops,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

export function useStop(stopId: string) {
  return useQuery({
    queryKey: ['stops', stopId],
    queryFn: () => fetchStop(stopId),
    enabled: stopId.length > 0,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}
