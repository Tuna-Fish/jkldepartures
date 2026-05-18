// src/hooks/useVehiclePositions.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { VehiclePosition, VehiclesResult } from '../api/types'

const BASE_URL = 'http://tunamasiina.freeddns.org:8081'

const VEHICLE_STALE_AFTER  = 30     // seconds
const NEARBY_RADIUS_METRES = 1000

// ── Helpers ───────────────────────────────────────────────────────────────────

function distanceMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function mapVehicleStatus(val: string | undefined): VehiclePosition['currentStatus'] {
  if (val === 'STOPPED_AT')  return 'STOPPED_AT'
  if (val === 'INCOMING_AT') return 'INCOMING_AT'
  return 'IN_TRANSIT_TO'
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchVehicles(): Promise<VehiclesResult> {
  const response = await fetch(`${BASE_URL}/api/vehicles`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Vehicles fetch failed: ${response.status} ${response.statusText}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await response.json() as { fetchedAt: number; vehicles: any[] }

  const vehicles: VehiclePosition[] = (raw.vehicles ?? []).map((v): VehiclePosition => ({
    vehicleId:      v.vehicleid     ?? v.vehicleId ?? '',
    vehicleLabel:   v.vehicleLabel  ?? '',
    tripId:         v.tripId,
    routeId:        v.routeId       ?? '',
    routeShortName: v.routeShortName ?? v.route_short_name,
    latitude:       v.latitude      ?? 0,
    longitude:      v.longitude     ?? 0,
    bearing:        v.bearing,
    travelBearing:  v.travelBearing ?? v.bearing,
    speed:          v.speed,
    currentStopId:  v.currentStopId,
    currentStatus:  mapVehicleStatus(v.currentStatus),
    timestamp:      v.timestamp     ?? 0,
  }))

  return { vehicles, fetchedAt: raw.fetchedAt }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseVehiclePositionsResult {
  vehicles: VehiclePosition[]
  forRoute: (routeId: string) => VehiclePosition[]
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
    queryFn: fetchVehicles,
    refetchInterval: 5_000,
    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
  })

  // Stale check uses dataUpdatedAt (set by React Query when data arrives)
  // rather than Date.now() — avoids calling impure function during render
  const vehicles = useMemo(() => {
    if (!query.data) return []
    const nowSeconds = Math.floor(query.dataUpdatedAt / 1000)
    return query.data.vehicles.filter(
      v => v.timestamp > 0 && (nowSeconds - v.timestamp) <= VEHICLE_STALE_AFTER
    )
  }, [query.data, query.dataUpdatedAt])

  const forRoute = useMemo(() =>
    (routeId: string) => vehicles.filter(v => v.routeId === routeId),
  [vehicles])

  const nearCoordinate = useMemo(() =>
    (lat: number, lon: number, radiusMetres = NEARBY_RADIUS_METRES) =>
      vehicles
        .map(v => ({ ...v, distanceMetres: distanceMetres(lat, lon, v.latitude, v.longitude) }))
        .filter(v => v.distanceMetres <= radiusMetres)
        .sort((a, b) => a.distanceMetres - b.distanceMetres),
  [vehicles])

  return {
    vehicles,
    forRoute,
    nearCoordinate,
    isLoading: query.isLoading,
    isError:   query.isError,
    fetchedAt: query.data?.fetchedAt ?? null,
    refetch:   query.refetch,
  }
}