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