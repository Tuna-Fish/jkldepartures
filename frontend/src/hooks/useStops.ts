import { useQuery } from '@tanstack/react-query'
import { fetchStops } from '../services/stops'

export function useStops() {
  return useQuery({
    queryKey: ['stops'],
    queryFn: fetchStops,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}
