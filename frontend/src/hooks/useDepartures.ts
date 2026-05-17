import { useQuery } from '@tanstack/react-query'
import { fetchDepartures } from '../services/departures'

export function useDepartures(stopId: string) {
  return useQuery({
    queryKey: ['stops', stopId, 'departures'],
    queryFn: () => fetchDepartures(stopId),
    enabled: stopId.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
