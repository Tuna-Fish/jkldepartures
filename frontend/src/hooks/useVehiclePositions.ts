// src/hooks/useVehiclePositions.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchVehiclePositions } from '../api/gtfs'
import {
  filterStaleVehicles,
  getVehiclesForRoute,
  getNearbyVehicles,
} from '../services/vehicles'
import type { VehiclePosition } from '../api/types'

interface UseVehiclePositionsResult {
  // All vehicles with fresh position data
  vehicles: VehiclePosition[]
  // Helper: vehicles on a specific route
  forRoute: (routeId: string) => VehiclePosition[]
  // Helper: vehicles near a lat/lon coordinate
  nearCoordinate: (
    lat: number,
    lon: number,
    radiusMetres?: number
  ) => Array<VehiclePosition & { distanceMetres: number }>
  isLoading: boolean
  isError: boolean
  fetchedAt: number | null
  refetch: () => void
}

export function useVehiclePositions(): UseVehiclePositionsResult {
  const query = useQuery({
    queryKey: ['vehiclePositions'],
    queryFn: fetchVehiclePositions,

    // Poll every 5s — VehiclePosition feed allows every 1s but
    // 5s is enough for smooth map updates without hammering the API
    refetchInterval: 5_000,

    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
  })

  // Filter out stale positions so the map only shows vehicles
  // that have reported recently
  const vehicles = useMemo(() => {
    if (!query.data) return []
    return filterStaleVehicles(query.data.vehicles)
  }, [query.data])

  const forRoute = useMemo(() => {
    return (routeId: string) => getVehiclesForRoute(vehicles, routeId)
  }, [vehicles])

  const nearCoordinate = useMemo(() => {
    return (lat: number, lon: number, radiusMetres?: number) =>
      getNearbyVehicles(vehicles, lat, lon, radiusMetres)
  }, [vehicles])

  return {
    vehicles,
    forRoute,
    nearCoordinate,
    isLoading:  query.isLoading,
    isError:    query.isError,
    fetchedAt:  query.data?.fetchedAt ?? null,
    refetch:    query.refetch,
  }
}