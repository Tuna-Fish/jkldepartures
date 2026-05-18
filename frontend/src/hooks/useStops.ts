// src/hooks/useStops.ts
import { useQuery, useQueries } from '@tanstack/react-query'
import type { Stop, StopsResult, StopResult, StopMetadata } from '../api/types'

const BASE_URL = 'http://tunamasiina.freeddns.org:8081'

// ── Raw backend shapes ────────────────────────────────────────────────────────

interface RawStop {
  stop_id: string
  stop_name: string
}

interface RawStopDetail {
  stopId?: string
  stop_id?: string
  name?: string
  stop_name?: string
  lat?: string
  lon?: string
  latitude?: string
  longitude?: string
  zone_id?: string
  location_type?: string
  municipality_id?: string
  wheelchair_boarding?: string
  platform_code?: string
  vehicle_type?: string
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function mapRawStop(raw: RawStop): Stop {
  return {
    stopId: raw.stop_id,
    id:     raw.stop_id,   // ← id must equal stop_id so navigation works
    name:   raw.stop_name,
  }
}

function mapRawStopDetail(raw: RawStopDetail, stopId: string): StopMetadata {
  const id = raw.stopId ?? raw.stop_id ?? stopId
  const latRaw = raw.lat ?? raw.latitude
  const lonRaw = raw.lon ?? raw.longitude

  return {
    stopId:            id,
    id,
    name:              raw.name ?? raw.stop_name ?? `Stop ${id}`,
    lat:               latRaw,
    lon:               lonRaw,
    latitude:          latRaw  ? parseFloat(latRaw)  : undefined,
    longitude:         lonRaw  ? parseFloat(lonRaw)  : undefined,
    zoneId:            raw.zone_id,
    zone_id:           raw.zone_id,
    locationType:      raw.location_type ? parseInt(raw.location_type) : undefined,
    location_type:     raw.location_type,
    municipalityId:    raw.municipality_id,
    municipality_id:   raw.municipality_id,
    wheelchairBoarding: raw.wheelchair_boarding,
    wheelchair_boarding: raw.wheelchair_boarding,
    platformCode:      raw.platform_code,
    platform_code:     raw.platform_code,
    vehicleType:       raw.vehicle_type,
    vehicle_type:      raw.vehicle_type,
  }
}

// ── Fetch functions ───────────────────────────────────────────────────────────

async function fetchStops(): Promise<StopsResult> {
  const response = await fetch(`${BASE_URL}/api/stops`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Stops fetch failed: ${response.status} ${response.statusText}`)
  }

  const raw = await response.json() as { fetchedAt: number; stops: RawStop[] }

  return {
    fetchedAt: raw.fetchedAt,
    stops: (raw.stops ?? []).map(mapRawStop),
  }
}

async function fetchStop(stopId: string): Promise<StopResult> {
  const response = await fetch(
    `${BASE_URL}/api/stops/${encodeURIComponent(stopId)}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!response.ok) {
    throw new Error(`Stop fetch failed: ${response.status} ${response.statusText}`)
  }

  const raw = await response.json() as { fetchedAt: number; stop: RawStopDetail }

  return {
    fetchedAt: raw.fetchedAt,
    stop: mapRawStopDetail(raw.stop ?? {}, stopId),
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the full list of stops for the search page.
 * Cached for 10 minutes — stop names don't change often.
 */
export function useStops() {
  return useQuery({
    queryKey: ['stops'],
    queryFn:  fetchStops,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Fetches a single stop's metadata by ID.
 * Used by StopPage header.
 */
export function useStop(stopId: string) {
  return useQuery({
    queryKey: ['stop', stopId],
    queryFn:  () => fetchStop(stopId),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: stopId.length > 0,
  })
}

/**
 * Fetches metadata for multiple stops in parallel.
 * Used by MapPage to show stop markers for vehicles' current stops.
 */
export function useStopMarkers(stopIds: string[]) {
  return useQueries({
    queries: stopIds.map(stopId => ({
      queryKey: ['stop', stopId],
      queryFn:  () => fetchStop(stopId),
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: stopId.length > 0,
    })),
  })
}