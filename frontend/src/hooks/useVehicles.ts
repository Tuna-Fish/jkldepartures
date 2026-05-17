import { useQuery } from '@tanstack/react-query'
import { fetchVehicles } from '../services/vehicles'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
    staleTime: 5_000,
    refetchInterval: 5_000,
  })
}
