// src/api/departures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches departure data from the Rust backend.
// The backend handles all GTFS protobuf decoding and static data joining.
// ─────────────────────────────────────────────────────────────────────────────

import type { Departure, DepartureStatus, DeparturesResult } from './types'

const BASE_URL = 'http://tunamasiina.freeddns.org:8081'

// ── Raw backend shape ─────────────────────────────────────────────────────────

interface BackendDeparture {
  arrive?: string
  depart?: string
  delaySeconds?: string | number
  hasRealtime?: boolean
  headsign?: string
  platform_code?: string | number
  platformCode?: string | number
  realtimeDeparture?: string | number
  route_id?: string | number
  routeId?: string | number
  route_long_name?: string
  routeLongName?: string
  route_short_name?: string | number
  routeShortName?: string | number
  sequence?: string | number
  scheduledDeparture?: string | number
  status?: string
  trip_id?: string
  tripId?: string
}

type DeparturesResponse = BackendDeparture[] | {
  departures?: BackendDeparture[]
  data?: BackendDeparture[]
  fetchedAt?: number
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function getDeparturesFromResponse(data: DeparturesResponse): BackendDeparture[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.departures)) return data.departures
  if (Array.isArray(data.data)) return data.data
  return []
}

function parseGtfsTime(time: string | undefined, fetchedAt: number): number | null {
  if (!time) return null
  const parts = time.split(':').map(Number)
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null
  const [hours, minutes, seconds] = parts
  const fetchedDate = new Date(fetchedAt)
  const departureDate = new Date(
    fetchedDate.getFullYear(),
    fetchedDate.getMonth(),
    fetchedDate.getDate(),
    hours,
    minutes,
    seconds,
  )
  if (departureDate.getTime() + 12 * 60 * 60_000 < fetchedAt) {
    departureDate.setDate(departureDate.getDate() + 1)
  }
  return Math.floor(departureDate.getTime() / 1000)
}

function routeIdFromTripId(tripId: string): string {
  const parts = tripId.split('_')
  const routeCandidate = parts.find(part => /^\d{2,5}$/.test(part))
  if (!routeCandidate) return '?'
  return routeCandidate.replace(/0+$/, '') || routeCandidate
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toDepartureStatus(value: string | undefined, delaySeconds: number): DepartureStatus {
  if (value === 'CANCELLED' || value === 'NO_DATA') return value
  if (delaySeconds > 60)  return 'DELAYED'
  if (delaySeconds < -60) return 'EARLY'
  if (value === 'ON_TIME' || value === 'DELAYED' || value === 'EARLY') return value
  return 'ON_TIME'
}

function toDeparture(departure: BackendDeparture, fetchedAt: number): Departure | null {
  const tripId = departure.trip_id ?? departure.tripId
  const scheduledDeparture = toNumber(departure.scheduledDeparture)
    ?? parseGtfsTime(departure.depart ?? departure.arrive, fetchedAt)

  if (!tripId || scheduledDeparture === null) return null

  const routeId = departure.route_id === undefined
    ? routeIdFromTripId(tripId)
    : String(departure.route_id)

  const routeShortName = departure.route_short_name ?? departure.routeShortName
  const routeLongName  = departure.route_long_name  ?? departure.routeLongName
  const realtimeDeparture = toNumber(departure.realtimeDeparture) ?? scheduledDeparture
  const delaySeconds = toNumber(departure.delaySeconds) ?? realtimeDeparture - scheduledDeparture

  return {
    tripId,
    routeId,
    routeShortName: routeShortName === undefined ? undefined : String(routeShortName),
    routeLongName,
    headsign: departure.headsign ?? routeLongName ?? `Route ${routeShortName ?? routeId}`,
    scheduledDeparture,
    realtimeDeparture,
    delaySeconds,
    status: toDepartureStatus(departure.status, delaySeconds),
    hasRealtime: departure.hasRealtime ?? false,
    platform: departure.platform_code === undefined && departure.platformCode === undefined
      ? undefined
      : String(departure.platform_code ?? departure.platformCode),
  }
}

// ── Public fetch function ─────────────────────────────────────────────────────

export async function fetchDepartures(stopId: string): Promise<DeparturesResult> {
    console.log('[departures] fetching for stopId:', stopId, typeof stopId)
  const response = await fetch(
    `${BASE_URL}/api/stops/${encodeURIComponent(stopId)}/departures`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) {
    throw new Error(`Departures fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as DeparturesResponse
  const fetchedAt = Array.isArray(data) ? Date.now() : (data.fetchedAt ?? Date.now())

  return {
    departures: getDeparturesFromResponse(data)
      .map(d => toDeparture(d, fetchedAt))
      .filter((d): d is Departure => d !== null),
    fetchedAt,
  }
}