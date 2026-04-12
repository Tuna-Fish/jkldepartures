// src/api/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared domain types for the Jyväskylä transit app.
// These types are the contract between:
//   - the frontend GTFS decoder (api/gtfs.ts) — current implementation
//   - the Rust backend (future) — must return JSON matching these shapes
// ─────────────────────────────────────────────────────────────────────────────

// ── Freshness ────────────────────────────────────────────────────────────────

/** Wraps any data payload with metadata about when it was fetched */
export interface FreshData<T> {
  data: T
  fetchedAt: number   // Date.now() ms timestamp
  isStale: boolean    // true if older than the feed's max age
}

// ── Service Alerts ───────────────────────────────────────────────────────────

export type AlertSeverity = 'INFO' | 'WARNING' | 'SEVERE' | 'UNKNOWN'
export type AlertEffect =
  | 'NO_SERVICE' | 'REDUCED_SERVICE' | 'SIGNIFICANT_DELAYS'
  | 'DETOUR' | 'ADDITIONAL_SERVICE' | 'MODIFIED_SERVICE'
  | 'OTHER_EFFECT' | 'UNKNOWN_EFFECT' | 'STOP_MOVED'

export interface ServiceAlert {
  id: string
  headerText: string
  descriptionText: string
  severity: AlertSeverity
  effect: AlertEffect
  activePeriods: Array<{ start?: number; end?: number }>
  affectedRoutes: string[]
  affectedStops: string[]
  url?: string
}

// ── Trip Updates / Departures ─────────────────────────────────────────────────

export type ScheduleRelationship = 'SCHEDULED' | 'CANCELED' | 'ADDED' | 'UNSCHEDULED'
export type StopStatus = 'SCHEDULED' | 'SKIPPED' | 'NO_DATA'

export interface StopTimeUpdate {
  stopId: string
  arrivalTime?: number    // Unix seconds
  departureTime?: number  // Unix seconds
  status: StopStatus
}

export interface TripUpdate {
  tripId: string
  routeId: string
  vehicleId?: string
  vehicleLabel?: string   // headsign e.g. "Keskusta"
  startTime: string       // "HH:MM:SS"
  startDate: string       // "YYYYMMDD"
  scheduleRelationship: ScheduleRelationship
  stopTimeUpdates: StopTimeUpdate[]
  timestamp?: number      // when the vehicle last reported
}

// ── Vehicle Positions ─────────────────────────────────────────────────────────

export type VehicleStopStatus =
  | 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO'

export interface VehiclePosition {
  vehicleId: string
  vehicleLabel?: string   // headsign
  tripId?: string
  routeId?: string
  latitude: number
  longitude: number
  bearing?: number        // degrees, 0 = north
  speed?: number          // m/s
  currentStopId?: string
  currentStatus: VehicleStopStatus
  timestamp: number       // Unix seconds
}

// ── Departure (derived type — computed by services/departures.ts) ─────────────
// This is what the UI actually renders. It combines a TripUpdate
// with enrichment (delay calculation, status derivation).

export type DepartureStatus = 'ON_TIME' | 'DELAYED' | 'EARLY' | 'CANCELLED' | 'NO_DATA'

export interface Departure {
  tripId: string
  routeId: string
  headsign: string          // e.g. "Keskusta" or "Mattilanniemi"
  scheduledDeparture: number  // Unix seconds
  realtimeDeparture: number   // Unix seconds (same as scheduled if no realtime)
  delaySeconds: number        // positive = late, negative = early
  status: DepartureStatus
  hasRealtime: boolean
  vehicleId?: string
  platform?: string
}

// ── Raw feed response wrappers ────────────────────────────────────────────────
// Used internally by api/gtfs.ts — not exposed to components

export interface RawFeedResult {
  tripUpdates: TripUpdate[]
  fetchedAt: number
}

export interface RawAlertResult {
  alerts: ServiceAlert[]
  fetchedAt: number
}

export interface RawVehicleResult {
  vehicles: VehiclePosition[]
  fetchedAt: number
}