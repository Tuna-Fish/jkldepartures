<<<<<<< HEAD
// src/services/departures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions that transform raw TripUpdate feed data into
// Departure objects the UI can render directly.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TripUpdate,
  Departure,
  DepartureStatus,
  StopTimeUpdate,
} from '../api/types'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Departure is considered "on time" if delay is within this window */
const ON_TIME_THRESHOLD_SECONDS = 60

/** How far ahead to show departures */
const LOOKAHEAD_SECONDS = 2 * 60 * 60  // 2 hours

/** Max departures to return per stop */
const MAX_DEPARTURES = 20

/** A feed timestamp this many seconds old is considered stale */
export const TRIP_UPDATE_STALE_AFTER = 90

// ── Status derivation ─────────────────────────────────────────────────────────

function deriveDepartureStatus(
  scheduleRelationship: TripUpdate['scheduleRelationship'],
  stopStatus: StopTimeUpdate['status'],
  delaySeconds: number
): DepartureStatus {
  if (scheduleRelationship === 'CANCELED') return 'CANCELLED'
  if (stopStatus === 'SKIPPED')            return 'CANCELLED'
  if (stopStatus === 'NO_DATA')            return 'NO_DATA'
  if (delaySeconds >  ON_TIME_THRESHOLD_SECONDS) return 'DELAYED'
  if (delaySeconds < -ON_TIME_THRESHOLD_SECONDS) return 'EARLY'
  return 'ON_TIME'
}

// ── Core transformation ───────────────────────────────────────────────────────

/**
 * Given all trip updates from the feed and a target stopId,
 * returns a sorted list of upcoming departures for that stop.
 */
export function getDeparturesForStop(
  tripUpdates: TripUpdate[],
  stopId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Departure[] {
  const cutoff = nowSeconds + LOOKAHEAD_SECONDS
  const departures: Departure[] = []

  for (const trip of tripUpdates) {
    // Find the stop time update for our target stop
    const stu = trip.stopTimeUpdates.find(s => s.stopId === stopId)
    if (!stu) continue

    // Use departure time if available, fall back to arrival time
    const realtimeTime = stu.departureTime ?? stu.arrivalTime
    if (!realtimeTime) continue

    // Skip departures that are in the past or too far ahead
    if (realtimeTime < nowSeconds - 30) continue
    if (realtimeTime > cutoff) continue

    // For scheduled-only trips, realtime === scheduled (no delay data)
    const scheduledTime = realtimeTime  // will be overridden when backend provides it
    const hasRealtime = trip.scheduleRelationship !== 'UNSCHEDULED' &&
                        stu.status !== 'NO_DATA'

    const delaySeconds = realtimeTime - scheduledTime

    const status = deriveDepartureStatus(
      trip.scheduleRelationship,
      stu.status,
      delaySeconds
    )

    departures.push({
      tripId:              trip.tripId,
      routeId:             trip.routeId,
      headsign:            trip.vehicleLabel ?? '',
      scheduledDeparture:  scheduledTime,
      realtimeDeparture:   realtimeTime,
      delaySeconds,
      status,
      hasRealtime,
      vehicleId:           trip.vehicleId,
      platform:            undefined,   // populated by backend join with stops.txt
    })
  }

  // Sort by realtime departure time ascending
  departures.sort((a, b) => a.realtimeDeparture - b.realtimeDeparture)

  return departures.slice(0, MAX_DEPARTURES)
}

// ── Staleness ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the feed data is too old to be reliable.
 * Used by the FreshnessIndicator and to show a warning banner.
 */
export function isFeedStale(
  fetchedAt: number,
  thresholdSeconds: number = TRIP_UPDATE_STALE_AFTER
): boolean {
  const ageSeconds = (Date.now() - fetchedAt) / 1000
  return ageSeconds > thresholdSeconds
}

/**
 * Returns how many seconds ago the feed was fetched.
 */
export function feedAgeSeconds(fetchedAt: number): number {
  return Math.floor((Date.now() - fetchedAt) / 1000)
}

// ── Departure filtering helpers ───────────────────────────────────────────────

/**
 * Filters out cancelled departures.
 * Used when the user wants to hide cancellations.
 */
export function filterCancelled(departures: Departure[]): Departure[] {
  return departures.filter(d => d.status !== 'CANCELLED')
}

/**
 * Returns only departures with realtime data.
 */
export function filterRealtimeOnly(departures: Departure[]): Departure[] {
  return departures.filter(d => d.hasRealtime)
}

/**
 * Returns true if any departure in the list is delayed by more than
 * the given threshold. Used to decide whether to show an alert banner.
 */
export function hasSignificantDelays(
  departures: Departure[],
  thresholdSeconds: number = 5 * 60
): boolean {
  return departures.some(
    d => d.status === 'DELAYED' && d.delaySeconds >= thresholdSeconds
  )
}
=======
import type { Departure, DepartureStatus, DeparturesResult } from '../api/types'

const STOPS_URL = 'http://tunamasiina.freeddns.org:8081/api/stops'

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
  if (delaySeconds > 0) return 'DELAYED'
  if (delaySeconds < 0) return 'EARLY'

  if (
    value === 'ON_TIME' ||
    value === 'DELAYED' ||
    value === 'EARLY'
  ) {
    return value
  }

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
  const routeLongName = departure.route_long_name ?? departure.routeLongName
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

export async function fetchDepartures(stopId: string): Promise<DeparturesResult> {
  const response = await fetch(`${STOPS_URL}/${encodeURIComponent(stopId)}/departures`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Departures fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as DeparturesResponse
  const fetchedAt = Array.isArray(data) ? Date.now() : data.fetchedAt ?? Date.now()

  return {
    departures: getDeparturesFromResponse(data)
      .map(departure => toDeparture(departure, fetchedAt))
      .filter((departure): departure is Departure => departure !== null),
    fetchedAt,
  }
}
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
