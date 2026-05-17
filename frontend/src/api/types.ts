// src/api/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared domain types — contract between the frontend and the Rust backend.
// ─────────────────────────────────────────────────────────────────────────────

// ── Stops ─────────────────────────────────────────────────────────────────────

/** Full stop metadata as returned by GET /api/stops/:id */
export interface StopMetadata {
  stopId: string
  id: string            // alias for stopId — used by StopSearch
  name: string
  lat?: string          // raw string from backend
  lon?: string
  latitude?: number     // parsed float — populated by useStop hook
  longitude?: number
  zoneId?: string
  zone_id?: string
  locationType?: number
  location_type?: string
  municipalityId?: string
  municipality_id?: string
  wheelchairBoarding?: string
  wheelchair_boarding?: string
  platformCode?: string
  platform_code?: string
  vehicleType?: string
  vehicle_type?: string
}

/** Backwards-compatible alias */
export type Stop = StopMetadata

export interface StopsResult {
  fetchedAt: number
  stops: Stop[]
}

export interface StopResult {
  fetchedAt: number
  stop: StopMetadata
}

// ── Service Alerts ────────────────────────────────────────────────────────────

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

export interface AlertsResult {
  fetchedAt: number
  alerts: ServiceAlert[]
}

// ── Trip Updates (internal) ───────────────────────────────────────────────────

export type ScheduleRelationship = 'SCHEDULED' | 'CANCELED' | 'ADDED' | 'UNSCHEDULED'
export type StopStatus = 'SCHEDULED' | 'SKIPPED' | 'NO_DATA'

export interface StopTimeUpdate {
  stopId: string
  arrivalTime?: number
  departureTime?: number
  status: StopStatus
}

export interface TripUpdate {
  tripId: string
  routeId: string
  vehicleId?: string
  vehicleLabel?: string
  startTime: string
  startDate: string
  scheduleRelationship: ScheduleRelationship
  stopTimeUpdates: StopTimeUpdate[]
  timestamp?: number
}

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

// ── Departures ────────────────────────────────────────────────────────────────

export type DepartureStatus = 'ON_TIME' | 'DELAYED' | 'EARLY' | 'CANCELLED' | 'NO_DATA'

export interface Departure {
  tripId: string
  routeId: string
  routeShortName?: string
  routeLongName?: string
  headsign: string
  scheduledDeparture: number    // Unix seconds
  realtimeDeparture: number     // Unix seconds
  delaySeconds: number
  status: DepartureStatus
  hasRealtime: boolean
  vehicleId?: string
  platform?: string
}

export interface DeparturesResult {
  fetchedAt: number
  stopId?: string
  departures: Departure[]
}

// ── Vehicle Positions ─────────────────────────────────────────────────────────

export type VehicleStopStatus = 'INCOMING_AT' | 'STOPPED_AT' | 'IN_TRANSIT_TO'

export interface VehiclePosition {
  vehicleId: string
  vehicleLabel?: string
  tripId?: string
  routeId?: string
  /** Short route name e.g. "4" — joined from routes.txt by the backend */
  routeShortName?: string
  latitude: number
  longitude: number
  bearing?: number
  /** Compass bearing derived from movement direction (may differ from GPS bearing) */
  travelBearing?: number
  speed?: number
  currentStopId?: string
  currentStatus: VehicleStopStatus
  timestamp: number
}

export interface VehiclesResult {
  fetchedAt: number
  vehicles: VehiclePosition[]
}