// src/api/gtfs.ts
// ─────────────────────────────────────────────────────────────────────────────
// Data ingestion layer — fetches and decodes GTFS Realtime binary feeds.
//
// BACKEND SWAP INSTRUCTIONS (when Rust backend is ready):
//   1. Delete the protobuf decoding functions (everything marked [DECODE])
//   2. Replace each fetch function body with a simple fetch to your backend:
//        const res = await fetch('http://localhost:8080/api/departures')
//        return res.json()
//   3. Keep all the TypeScript types in types.ts — they become the JSON contract
// ─────────────────────────────────────────────────────────────────────────────

import protobuf from 'protobufjs'
import type {
  TripUpdate,
  StopTimeUpdate,
  StopStatus,
  ScheduleRelationship,
  ServiceAlert,
  AlertSeverity,
  AlertEffect,
  VehiclePosition,
  VehicleStopStatus,
  RawFeedResult,
  RawAlertResult,
  RawVehicleResult,
} from './types'


// ── GTFS Realtime protobuf descriptor ────────────────────────────────────────
// [DECODE] This is only needed while decoding binary directly in the browser.
// The proto definition is the standard GTFS-RT spec v2.0.

const GTFS_PROTO = `
syntax = "proto2";

package transit_realtime;

message FeedMessage {
  required FeedHeader header = 1;
  repeated FeedEntity entity = 2;
}

message FeedHeader {
  required string gtfs_realtime_version = 1;
  optional uint64 timestamp = 3;
}

message FeedEntity {
  required string id = 1;
  optional bool is_deleted = 3;
  optional TripUpdate trip_update = 5;
  optional VehiclePosition vehicle = 6;
  optional Alert alert = 7;
}

message TripUpdate {
  required TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 3;
  repeated StopTimeUpdate stop_time_update = 2;
  optional uint64 timestamp = 4;
}

message TripDescriptor {
  optional string trip_id = 1;
  optional string route_id = 5;
  optional string start_time = 2;
  optional string start_date = 3;
  optional int32 direction_id = 6;
  optional int32 schedule_relationship = 4;
}

message VehicleDescriptor {
  optional string id = 1;
  optional string label = 2;
  optional string license_plate = 3;
}

message StopTimeUpdate {
  optional uint32 stop_sequence = 1;
  optional string stop_id = 4;
  optional StopTimeEvent arrival = 2;
  optional StopTimeEvent departure = 3;
  optional int32 schedule_relationship = 5;
}

message StopTimeEvent {
  optional int32 delay = 1;
  optional int64 time = 2;
  optional int32 uncertainty = 3;
}

message VehiclePosition {
  optional TripDescriptor trip = 1;
  optional VehicleDescriptor vehicle = 8;
  optional Position position = 2;
  optional uint32 current_stop_sequence = 3;
  optional string stop_id = 7;
  optional int32 current_status = 4;
  optional uint64 timestamp = 5;
}

message Position {
  required float latitude = 1;
  required float longitude = 2;
  optional float bearing = 3;
  optional float speed = 6;
}

message Alert {
  repeated TimeRange active_period = 1;
  repeated EntitySelector informed_entity = 5;
  optional int32 cause = 6;
  optional int32 effect = 7;
  optional TranslatedString url = 8;
  optional TranslatedString header_text = 10;
  optional TranslatedString description_text = 11;
  optional int32 severity_level = 14;
}

message TimeRange {
  optional uint64 start = 1;
  optional uint64 end = 2;
}

message EntitySelector {
  optional string agency_id = 1;
  optional string route_id = 2;
  optional int32 route_type = 3;
  optional string stop_id = 4;
  optional TripDescriptor trip = 5;
}

message TranslatedString {
  repeated Translation translation = 1;
  message Translation {
    required string text = 1;
    optional string language = 2;
  }
}
`

// ── Protobuf root (cached after first parse) ──────────────────────────────────
// [DECODE] Remove when switching to backend.

let _protoRoot: protobuf.Root | null = null

async function getProtoRoot(): Promise<protobuf.Root> {
  if (_protoRoot) return _protoRoot
  _protoRoot = protobuf.parse(GTFS_PROTO, { keepCase: true }).root
  return _protoRoot
}

// ── Feed URLs (via Vite dev proxy → opendata.waltti.fi) ───────────────────────
// In production or with a backend, replace these with your backend's URLs.

const FEED_URLS = {
  tripUpdate:      '/api/gtfs/tripupdate',
  vehiclePosition: '/api/gtfs/vehicleposition',
  serviceAlert:    '/api/gtfs/servicealert',
} as const

// ── Core fetch utility ────────────────────────────────────────────────────────

async function fetchBinaryFeed(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/x-protobuf, application/octet-stream',
      // Explicitly tell the server we can handle gzip — the browser will
      // decompress automatically when this header is present
      'Accept-Encoding': 'gzip, deflate, br',
    },
  })
  console.log('[gtfs] Response URL:', response.url)
console.log('[gtfs] Status:', response.status)
// Read as text to see the actual error page
const text = await response.text()
console.log('[gtfs] Body preview:', text.slice(0, 300))

  if (!response.ok) {
    throw new Error(
      `Feed fetch failed: ${response.status} ${response.statusText} (${url})`
    )
  }

  // Debug: log content-type and content-encoding so we can see what we got
  console.log('[gtfs] Content-Type:', response.headers.get('content-type'))
  console.log('[gtfs] Content-Encoding:', response.headers.get('content-encoding'))

  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Debug: log first 4 bytes — protobuf starts with 0x0a, gzip starts with 0x1f 0x8b
  console.log('[gtfs] First bytes:', bytes[0], bytes[1], bytes[2], bytes[3])

  return bytes
}

// ── Translation helper ────────────────────────────────────────────────────────
// GTFS TranslatedString picks Finnish (fi) first, falls back to first available.
// [DECODE] Remove when switching to backend.

function pickTranslation(translated: any): string {
  if (!translated?.translation?.length) return ''
  const fi = translated.translation.find((t: any) => t.language === 'fi')
  return (fi ?? translated.translation[0])?.text ?? ''
}

// ── Schedule relationship mapping ─────────────────────────────────────────────
// [DECODE] Remove when switching to backend.

function mapScheduleRelationship(value: number | undefined): ScheduleRelationship {
  switch (value) {
    case 1:  return 'CANCELED'
    case 2:  return 'ADDED'
    case 3:  return 'UNSCHEDULED'
    default: return 'SCHEDULED'
  }
}

function mapStopStatus(value: number | undefined): StopStatus {
  switch (value) {
    case 1:  return 'SKIPPED'
    case 2:  return 'NO_DATA'
    default: return 'SCHEDULED'
  }
}

function mapVehicleStopStatus(value: number | undefined): VehicleStopStatus {
  switch (value) {
    case 0:  return 'INCOMING_AT'
    case 1:  return 'STOPPED_AT'
    default: return 'IN_TRANSIT_TO'
  }
}

function mapAlertSeverity(value: number | undefined): AlertSeverity {
  switch (value) {
    case 2:  return 'INFO'
    case 3:  return 'WARNING'
    case 4:  return 'SEVERE'
    default: return 'UNKNOWN'
  }
}

function mapAlertEffect(value: number | undefined): AlertEffect {
  const effects: Record<number, AlertEffect> = {
    1: 'NO_SERVICE', 2: 'REDUCED_SERVICE', 3: 'SIGNIFICANT_DELAYS',
    4: 'DETOUR', 5: 'ADDITIONAL_SERVICE', 6: 'MODIFIED_SERVICE',
    7: 'OTHER_EFFECT', 8: 'UNKNOWN_EFFECT', 9: 'STOP_MOVED',
  }
  return effects[value ?? -1] ?? 'UNKNOWN_EFFECT'
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches and decodes the TripUpdate feed.
 * Returns all trip updates currently active in Jyväskylä.
 *
 * BACKEND SWAP: replace body with:
 *   const res = await fetch('/api/trip-updates')
 *   const data = await res.json()
 *   return { tripUpdates: data, fetchedAt: Date.now() }
 */
export async function fetchTripUpdates(): Promise<RawFeedResult> {
  const [root, bytes] = await Promise.all([
    getProtoRoot(),
    fetchBinaryFeed(FEED_URLS.tripUpdate),
  ])

  const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
  const feed = FeedMessage.decode(bytes) as any

  const tripUpdates: TripUpdate[] = (feed.entity ?? [])
    .filter((e: any) => e.trip_update)
    .map((e: any): TripUpdate => {
      const tu = e.trip_update
      const trip = tu.trip ?? {}
      const vehicle = tu.vehicle ?? {}

      const stopTimeUpdates: StopTimeUpdate[] = (tu.stop_time_update ?? [])
        .map((stu: any): StopTimeUpdate => ({
          stopId: stu.stop_id ?? '',
          arrivalTime: stu.arrival?.time
            ? Number(stu.arrival.time) : undefined,
          departureTime: stu.departure?.time
            ? Number(stu.departure.time) : undefined,
          status: mapStopStatus(stu.schedule_relationship),
        }))

      return {
        tripId:               trip.trip_id ?? e.id,
        routeId:              trip.route_id ?? '',
        vehicleId:            vehicle.id,
        vehicleLabel:         vehicle.label,
        startTime:            trip.start_time ?? '',
        startDate:            trip.start_date ?? '',
        scheduleRelationship: mapScheduleRelationship(trip.schedule_relationship),
        stopTimeUpdates,
        timestamp: tu.timestamp ? Number(tu.timestamp) : undefined,
      }
    })

  return { tripUpdates, fetchedAt: Date.now() }
}

/**
 * Fetches and decodes the ServiceAlert feed.
 *
 * BACKEND SWAP: replace body with:
 *   const res = await fetch('/api/alerts')
 *   const data = await res.json()
 *   return { alerts: data, fetchedAt: Date.now() }
 */
export async function fetchServiceAlerts(): Promise<RawAlertResult> {
  const [root, bytes] = await Promise.all([
    getProtoRoot(),
    fetchBinaryFeed(FEED_URLS.serviceAlert),
  ])

  const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
  const feed = FeedMessage.decode(bytes) as any

  const alerts: ServiceAlert[] = (feed.entity ?? [])
    .filter((e: any) => e.alert)
    .map((e: any): ServiceAlert => {
      const a = e.alert
      return {
        id:              e.id,
        headerText:      pickTranslation(a.header_text),
        descriptionText: pickTranslation(a.description_text),
        severity:        mapAlertSeverity(a.severity_level),
        effect:          mapAlertEffect(a.effect),
        url:             pickTranslation(a.url) || undefined,
        activePeriods: (a.active_period ?? []).map((p: any) => ({
          start: p.start ? Number(p.start) : undefined,
          end:   p.end   ? Number(p.end)   : undefined,
        })),
        affectedRoutes: (a.informed_entity ?? [])
          .map((ie: any) => ie.route_id)
          .filter(Boolean),
        affectedStops: (a.informed_entity ?? [])
          .map((ie: any) => ie.stop_id)
          .filter(Boolean),
      }
    })

  return { alerts, fetchedAt: Date.now() }
}

/**
 * Fetches and decodes the VehiclePosition feed.
 *
 * BACKEND SWAP: replace body with:
 *   const res = await fetch('/api/vehicles')
 *   const data = await res.json()
 *   return { vehicles: data, fetchedAt: Date.now() }
 */
export async function fetchVehiclePositions(): Promise<RawVehicleResult> {
  const [root, bytes] = await Promise.all([
    getProtoRoot(),
    fetchBinaryFeed(FEED_URLS.vehiclePosition),
  ])

  const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
  const feed = FeedMessage.decode(bytes) as any

  const vehicles: VehiclePosition[] = (feed.entity ?? [])
    .filter((e: any) => e.vehicle)
    .map((e: any): VehiclePosition => {
      const v = e.vehicle
      const pos = v.position ?? {}
      const trip = v.trip ?? {}
      const vehicle = v.vehicle ?? {}

      return {
        vehicleId:     vehicle.id ?? e.id,
        vehicleLabel:  vehicle.label,
        tripId:        trip.trip_id,
        routeId:       trip.route_id,
        latitude:      pos.latitude  ?? 0,
        longitude:     pos.longitude ?? 0,
        bearing:       pos.bearing,
        speed:         pos.speed,
        currentStopId: v.stop_id,
        currentStatus: mapVehicleStopStatus(v.current_status),
        timestamp:     v.timestamp ? Number(v.timestamp) : Date.now() / 1000,
      }
    })

  return { vehicles, fetchedAt: Date.now() }
}