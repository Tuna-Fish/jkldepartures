// src/api/gtfs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data ingestion layer — fetches from the Rust backend JSON API.
// The backend handles all GTFS protobuf decoding and static data joining.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TripUpdate,
  StopTimeUpdate,
  ServiceAlert,
  AlertSeverity,
  AlertEffect,
  VehiclePosition,
  VehicleStopStatus,
  RawFeedResult,
  RawAlertResult,
  RawVehicleResult,
} from './types'

const BASE_URL = 'http://tunamasiina.freeddns.org:8081'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} (${path})`)
  }
  return response.json()
}

// ── Alerts ────────────────────────────────────────────────────────────────────

function mapSeverity(val: unknown): AlertSeverity {
  if (val === 2) return 'INFO'
  if (val === 3) return 'WARNING'
  if (val === 4) return 'SEVERE'
  return 'UNKNOWN'
}

function mapEffect(val: unknown): AlertEffect {
  const effects: Record<number, AlertEffect> = {
    1: 'NO_SERVICE', 2: 'REDUCED_SERVICE', 3: 'SIGNIFICANT_DELAYS',
    4: 'DETOUR', 5: 'ADDITIONAL_SERVICE', 6: 'MODIFIED_SERVICE',
    7: 'OTHER_EFFECT', 8: 'UNKNOWN_EFFECT', 9: 'STOP_MOVED',
  }
  return effects[val as number] ?? 'UNKNOWN_EFFECT'
}

function pickTranslation(translated: unknown): string {
  if (!translated || typeof translated !== 'object') return ''
  const t = translated as { translation?: Array<{ text?: string; language?: string }> }
  if (!t.translation?.length) return ''
  const fi = t.translation.find(x => x.language === 'fi')
  return (fi ?? t.translation[0])?.text ?? ''
}

export async function fetchServiceAlerts(): Promise<RawAlertResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchJson<{ fetchedAt: number; alerts: any[] }>('/api/alerts')

  const alerts: ServiceAlert[] = (raw.alerts ?? []).map((a): ServiceAlert => ({
    id:              a.id ?? '',
    headerText:      pickTranslation(a.header_text) || a.header_text?.translation?.[0]?.text || '',
    descriptionText: pickTranslation(a.description_text) || '',
    severity:        mapSeverity(a.severity_level),
    effect:          mapEffect(a.effect),
    url:             pickTranslation(a.url) || undefined,
    activePeriods:   (a.active_period ?? []).map((p: { start?: number; end?: number }) => ({
      start: p.start,
      end:   p.end,
    })),
    affectedRoutes:  (a.informed_entity ?? [])
      .map((ie: { route_id?: string }) => ie.route_id)
      .filter(Boolean),
    affectedStops:   (a.informed_entity ?? [])
      .map((ie: { stop_id?: string }) => ie.stop_id)
      .filter(Boolean),
  }))

  return { alerts, fetchedAt: raw.fetchedAt }
}

// ── Trip Updates / Departures ─────────────────────────────────────────────────
// The backend /api/stops/:id/departures already joins static + realtime data.
// We model each departure as a single-stop TripUpdate for compatibility
// with the existing service layer.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDepartureToTripUpdate(dep: any): TripUpdate {
  const stu: StopTimeUpdate = {
    stopId:         dep.stopId ?? '',
    arrivalTime:    dep.scheduledDeparture,
    departureTime:  dep.realtimeDeparture ?? dep.scheduledDeparture,
    status:         dep.status === 'CANCELLED' ? 'SKIPPED'
                  : dep.status === 'NO_DATA'   ? 'NO_DATA'
                  : 'SCHEDULED',
  }

  return {
    tripId:               dep.trip_id   ?? '',
    routeId:              dep.route_id  ?? dep.routeId ?? '',
    vehicleId:            dep.vehicleid,
    vehicleLabel:         dep.headsign  ?? dep.vehicleLabel ?? '',
    startTime:            '',
    startDate:            '',
    scheduleRelationship: dep.status === 'CANCELLED' ? 'CANCELED' : 'SCHEDULED',
    stopTimeUpdates:      [stu],
    timestamp:            dep.scheduledDeparture,
  }
}

export async function fetchTripUpdates(stopId?: string): Promise<RawFeedResult> {
  if (!stopId) return { tripUpdates: [], fetchedAt: Date.now() }

  const raw = await fetchJson<{
    fetchedAt: number
    stopId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    departures: any[]
  }>(`/api/stops/${stopId}/departures`)

  const tripUpdates: TripUpdate[] = (raw.departures ?? []).map(dep =>
    mapDepartureToTripUpdate({ ...dep, stopId: raw.stopId })
  )

  return { tripUpdates, fetchedAt: raw.fetchedAt }
}

// ── Vehicle Positions ─────────────────────────────────────────────────────────

function mapVehicleStatus(val: string | undefined): VehicleStopStatus {
  if (val === 'STOPPED_AT')   return 'STOPPED_AT'
  if (val === 'INCOMING_AT')  return 'INCOMING_AT'
  return 'IN_TRANSIT_TO'
}

export async function fetchVehiclePositions(): Promise<RawVehicleResult> {
  const raw = await fetchJson<{
    fetchedAt: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vehicles: any[]
  }>('/api/vehicles')

  const vehicles: VehiclePosition[] = (raw.vehicles ?? []).map((v): VehiclePosition => ({
    vehicleId:     v.vehicleid   ?? v.vehicleId ?? '',
    vehicleLabel:  v.vehicleLabel ?? '',
    tripId:        v.tripId,
    routeId:       v.routeId     ?? '',
    latitude:      v.latitude    ?? 0,
    longitude:     v.longitude   ?? 0,
    bearing:       v.bearing,
    speed:         v.speed,
    currentStopId: v.currentStopId,
    currentStatus: mapVehicleStatus(v.currentStatus),
    timestamp:     v.timestamp   ?? Math.floor(Date.now() / 1000),
  }))

  return { vehicles, fetchedAt: raw.fetchedAt }
}