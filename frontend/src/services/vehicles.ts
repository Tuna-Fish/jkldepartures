<<<<<<< HEAD
// src/services/vehicles.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions for working with live vehicle position data.
// ─────────────────────────────────────────────────────────────────────────────

import type { VehiclePosition } from '../api/types'

// ── Constants ─────────────────────────────────────────────────────────────────

/** A vehicle position this many seconds old is considered stale */
export const VEHICLE_STALE_AFTER = 30

/**
 * Distance in metres beyond which a vehicle is not considered "nearby".
 * Used to filter the vehicle list on the map page.
 */
const NEARBY_RADIUS_METRES = 1000

// ── Staleness ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this vehicle's position report is too old to trust.
 * Stale vehicles should be shown faded or with a warning on the map.
 */
export function isVehicleStale(
  vehicle: VehiclePosition,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  return nowSeconds - vehicle.timestamp > VEHICLE_STALE_AFTER
}

/**
 * Filters out vehicles whose position reports are stale.
 */
export function filterStaleVehicles(
  vehicles: VehiclePosition[],
  nowSeconds: number = Math.floor(Date.now() / 1000)
): VehiclePosition[] {
  return vehicles.filter(v => !isVehicleStale(v, nowSeconds))
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/**
 * Returns vehicles currently serving a specific route.
 */
export function getVehiclesForRoute(
  vehicles: VehiclePosition[],
  routeId: string
): VehiclePosition[] {
  return vehicles.filter(v => v.routeId === routeId)
}

/**
 * Returns vehicles approaching or stopped at a specific stop.
 */
export function getVehiclesAtStop(
  vehicles: VehiclePosition[],
  stopId: string
): VehiclePosition[] {
  return vehicles.filter(
    v => v.currentStopId === stopId &&
         (v.currentStatus === 'STOPPED_AT' || v.currentStatus === 'INCOMING_AT')
  )
}

// ── Proximity ─────────────────────────────────────────────────────────────────

/**
 * Haversine distance between two lat/lon points in metres.
 */
export function distanceMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000  // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Returns vehicles within NEARBY_RADIUS_METRES of a given coordinate,
 * sorted by distance ascending. Used for the map page vehicle list.
 */
export function getNearbyVehicles(
  vehicles: VehiclePosition[],
  lat: number,
  lon: number,
  radiusMetres: number = NEARBY_RADIUS_METRES
): Array<VehiclePosition & { distanceMetres: number }> {
  return vehicles
    .map(v => ({
      ...v,
      distanceMetres: distanceMetres(lat, lon, v.latitude, v.longitude),
    }))
    .filter(v => v.distanceMetres <= radiusMetres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres)
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Converts m/s speed to km/h, rounded to nearest integer.
 */
export function speedKmh(speedMs: number): number {
  return Math.round(speedMs * 3.6)
}

/**
 * Returns a human-readable status label for a vehicle.
 * e.g. "Moving · 30 km/h" or "At stop"
 */
export function vehicleStatusLabel(
  vehicle: VehiclePosition,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const age = nowSeconds - vehicle.timestamp
  const ageStr = age < 60
    ? `${age}s ago`
    : `${Math.floor(age / 60)}m ago`

  if (isVehicleStale(vehicle, nowSeconds)) {
    return `Last seen ${ageStr}`
  }

  if (vehicle.currentStatus === 'STOPPED_AT') {
    return `At stop · ${ageStr}`
  }

  const kmh = vehicle.speed ? speedKmh(vehicle.speed) : 0
  return kmh > 0
    ? `${kmh} km/h · ${ageStr}`
    : `Moving · ${ageStr}`
}
=======
import type { VehiclePosition, VehicleStopStatus, VehiclesResult } from '../api/types'

const VEHICLES_URL = 'http://tunamasiina.freeddns.org:8081/api/vehicles'
const MIN_MOVEMENT_FOR_BEARING_METERS = 8

interface VehicleLocationSnapshot {
  latitude: number
  longitude: number
  timestamp: number
}

interface BackendVehicle {
  bearing?: string | number
  currentStatus?: string
  currentStopId?: string | number
  latitude?: string | number
  longitude?: string | number
  routeId?: string | number
  route_short_name?: string | number
  routeShortName?: string | number
  speed?: string | number
  timestamp?: string | number
  tripId?: string
  vehicleId?: string | number
  vehicleid?: string | number
  vehicleLabel?: string
}

type VehiclesResponse = BackendVehicle[] | {
  fetchedAt?: number
  vehicles?: BackendVehicle[]
  data?: BackendVehicle[]
}

const previousVehicleLocations = new Map<string, VehicleLocationSnapshot>()
const movementBearings = new Map<string, number>()

function getVehiclesFromResponse(data: VehiclesResponse): BackendVehicle[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.vehicles)) return data.vehicles
  if (Array.isArray(data.data)) return data.data
  return []
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toOptionalString(value: string | number | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return String(value)
}

function toVehicleStopStatus(value: string | undefined): VehicleStopStatus {
  if (
    value === 'INCOMING_AT' ||
    value === 'STOPPED_AT' ||
    value === 'IN_TRANSIT_TO'
  ) {
    return value
  }

  return 'IN_TRANSIT_TO'
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI
}

function normalizeBearing(degrees: number): number {
  return (degrees % 360 + 360) % 360
}

function distanceMeters(from: VehicleLocationSnapshot, to: VehicleLocationSnapshot): number {
  const earthRadiusMeters = 6_371_000
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const deltaLat = toRadians(to.latitude - from.latitude)
  const deltaLon = toRadians(to.longitude - from.longitude)
  const sinHalfLat = Math.sin(deltaLat / 2)
  const sinHalfLon = Math.sin(deltaLon / 2)
  const a = sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLon * sinHalfLon

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingBetween(from: VehicleLocationSnapshot, to: VehicleLocationSnapshot): number {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const deltaLon = toRadians(to.longitude - from.longitude)
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

  return normalizeBearing(toDegrees(Math.atan2(y, x)))
}

function toVehicle(vehicle: BackendVehicle): VehiclePosition | null {
  const vehicleId = vehicle.vehicleId ?? vehicle.vehicleid
  const latitude = toNumber(vehicle.latitude)
  const longitude = toNumber(vehicle.longitude)
  const timestamp = toNumber(vehicle.timestamp)

  if (vehicleId === undefined || latitude === undefined || longitude === undefined) {
    return null
  }

  const id = String(vehicleId)
  const currentLocation = {
    latitude,
    longitude,
    timestamp: timestamp ?? Math.floor(Date.now() / 1000),
  }
  const previousLocation = previousVehicleLocations.get(id)

  if (
    previousLocation &&
    currentLocation.timestamp > previousLocation.timestamp &&
    distanceMeters(previousLocation, currentLocation) >= MIN_MOVEMENT_FOR_BEARING_METERS
  ) {
    movementBearings.set(id, bearingBetween(previousLocation, currentLocation))
  }

  previousVehicleLocations.set(id, currentLocation)

  return {
    vehicleId: id,
    vehicleLabel: vehicle.vehicleLabel,
    tripId: vehicle.tripId,
    routeId: toOptionalString(vehicle.routeId),
    routeShortName: toOptionalString(vehicle.route_short_name ?? vehicle.routeShortName),
    latitude,
    longitude,
    bearing: toNumber(vehicle.bearing),
    travelBearing: movementBearings.get(id),
    speed: toNumber(vehicle.speed),
    currentStopId: toOptionalString(vehicle.currentStopId),
    currentStatus: toVehicleStopStatus(vehicle.currentStatus),
    timestamp: currentLocation.timestamp,
  }
}

function pruneVehicleHistory(vehicles: VehiclePosition[]) {
  const seenVehicleIds = new Set(vehicles.map(vehicle => vehicle.vehicleId))

  Array.from(previousVehicleLocations.keys()).forEach(vehicleId => {
    if (!seenVehicleIds.has(vehicleId)) {
      previousVehicleLocations.delete(vehicleId)
      movementBearings.delete(vehicleId)
    }
  })
}

export async function fetchVehicles(): Promise<VehiclesResult> {
  const response = await fetch(VEHICLES_URL, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Vehicles fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as VehiclesResponse

  const vehicles = getVehiclesFromResponse(data)
    .map(toVehicle)
    .filter((vehicle): vehicle is VehiclePosition => vehicle !== null)

  pruneVehicleHistory(vehicles)

  return {
    vehicles,
    fetchedAt: Array.isArray(data) ? Date.now() : data.fetchedAt ?? Date.now(),
  }
}
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
