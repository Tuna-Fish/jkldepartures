import { useQuery } from '@tanstack/react-query'
import { fetchAlerts } from '../services/alerts'

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 90_000,
  })
}
