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