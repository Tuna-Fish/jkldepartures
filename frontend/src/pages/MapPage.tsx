// src/pages/MapPage.tsx
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import FreshnessIndicator from '../components/FreshnessIndicator'
<<<<<<< HEAD
import { useVehiclePositions } from '../hooks/useVehiclePositions'
import { vehicleStatusLabel } from '../services/vehicles'
import type { VehiclePosition } from '../api/types'
=======
import type { StopMetadata, VehiclePosition } from '../api/types'
import { useStopMarkers } from '../hooks/useStops'
import { useVehicles } from '../hooks/useVehicles'
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Constants ─────────────────────────────────────────────────────────────────

const JKL_CENTRE: [number, number] = [62.2415, 25.7482]

const ROUTE_COLOURS: Record<string, string> = {
  '1': '#C62828', '4': '#1565C0', '7': '#E65100',
  '9': '#00695C', '12': '#2E7D32', '25': '#6A1B9A',
}

<<<<<<< HEAD
const MOCK_STOPS = [
  { id: '1111', name: 'Keskusta (M)', lat: 62.2415, lng: 25.7482 },
  { id: '3041', name: 'Yliopisto',    lat: 62.2320, lng: 25.7598 },
  { id: '1084', name: 'Hämeenkatu',  lat: 62.2501, lng: 25.7308 },
]

// ── Icon factories ────────────────────────────────────────────────────────────

function vehicleIcon(routeId: string) {
=======
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function markerZoomScale(zoom: number): number {
  return clamp(0.68 + (zoom - 12) * 0.16, 0.68, 1.8)
}

function vehicleIcon(routeId: string, bearing?: number, zoom = 14) {
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
  const colour = ROUTE_COLOURS[routeId] ?? '#2979FF'
  const scale = markerZoomScale(zoom)
  const circleRadius = 9 * scale
  const circleDiameter = circleRadius * 2
  const arrowWidth = circleDiameter
  const arrowHeight = 11 * scale
  const gap = 3 * scale
  const padding = 3 * scale
  const width = circleDiameter + padding * 2
  const height = arrowHeight + gap + circleDiameter + padding * 2
  const centerX = width / 2
  const circleCenterY = padding + arrowHeight + gap + circleRadius
  const arrowTipY = padding
  const arrowBaseY = padding + arrowHeight
  const arrowRotation = bearing ?? 0
  const fontSize = Math.max(8, 9 * scale)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
      viewBox="0 0 ${width} ${height}" overflow="visible">
      <g transform="rotate(${arrowRotation} ${centerX} ${circleCenterY})">
        <path
          d="M ${centerX} ${arrowTipY}
             L ${centerX + arrowWidth / 2} ${arrowBaseY}
             L ${centerX + arrowWidth * 0.16} ${arrowBaseY}
             L ${centerX} ${arrowBaseY - arrowHeight * 0.34}
             L ${centerX - arrowWidth * 0.16} ${arrowBaseY}
             L ${centerX - arrowWidth / 2} ${arrowBaseY}
             Z"
          fill="${colour}"
        />
      </g>
      <circle cx="${centerX}" cy="${circleCenterY}" r="${circleRadius + 4 * scale}" fill="${colour}" opacity="0.25"/>
      <circle cx="${centerX}" cy="${circleCenterY}" r="${circleRadius}" fill="${colour}"/>
      <text x="${centerX}" y="${circleCenterY + fontSize * 0.36}" text-anchor="middle"
        font-family="DM Mono,monospace" font-size="${fontSize}"
        font-weight="700" fill="white">${routeId}</text>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [width, height],
    iconAnchor: [centerX, circleCenterY],
    popupAnchor: [0, -circleRadius - arrowHeight - gap],
  })
}

function stopIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill="#f1f5f9" stroke="#0d0f14" stroke-width="2"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

<<<<<<< HEAD
=======
function routeLabel(v: VehiclePosition): string {
  return v.routeShortName || v.routeId || '?'
}

function speedKmh(speed: number | undefined): number {
  if (!speed) return 0

  // Some backend values arrive as centimetres per second from the GTFS source.
  const metresPerSecond = speed > 60 ? speed / 100 : speed
  return Math.round(metresPerSecond * 3.6)
}

function statusLabel(v: VehiclePosition): string {
  const age = Math.floor(Date.now() / 1000) - v.timestamp
  const ageStr = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`
  if (v.currentStatus === 'STOPPED_AT') return `At stop · ${ageStr}`
  const kmh = speedKmh(v.speed)
  return `${kmh} km/h · ${ageStr}`
}

>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
function VehicleListRow({ v }: { v: VehiclePosition }) {
  const label = routeLabel(v)
  const colour = ROUTE_COLOURS[label] ?? '#2979FF'
  const moving = v.currentStatus !== 'STOPPED_AT'

  return (
    <div className="bg-surface-raised border border-surface-border
      rounded-xl px-3.5 py-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center
          text-[13px] font-bold font-display flex-shrink-0"
        style={{ backgroundColor: colour, color: '#fff' }}
      >
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-100 truncate">
          Route {label}
          {v.vehicleLabel ? ` — ${v.vehicleLabel}` : ''}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {vehicleStatusLabel(v)}
        </p>
      </div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
        moving
          ? 'bg-[#1a3a1a] text-[#4ade80]'
          : 'bg-[#3a2a00] text-[#fbbf24]'
      }`}>
        {moving ? 'Moving' : 'At stop'}
      </span>
    </div>
  )
}

function hasStopCoordinates(stop: StopMetadata): stop is StopMetadata & {
  latitude: number
  longitude: number
} {
  return stop.latitude !== undefined && stop.longitude !== undefined
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: event => {
      onZoomChange(event.target.getZoom())
    },
  })

  return null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapPage() {
<<<<<<< HEAD
  const { vehicles, nearCoordinate, isLoading, fetchedAt } =
    useVehiclePositions()

  const nearbyVehicles = nearCoordinate(JKL_CENTRE[0], JKL_CENTRE[1])
=======
  const [mapZoom, setMapZoom] = useState(14)
  const {
    data: vehiclesData,
    isLoading: isVehiclesLoading,
    isError: isVehiclesError,
  } = useVehicles()
  const vehicles = useMemo(() => vehiclesData?.vehicles ?? [], [vehiclesData?.vehicles])
  const stopIds = useMemo(() => (
    Array.from(new Set(
      vehicles
        .map(vehicle => vehicle.currentStopId)
        .filter((stopId): stopId is string => stopId !== undefined && stopId.length > 0),
    ))
  ), [vehicles])
  const stopQueries = useStopMarkers(stopIds)
  const stops = stopQueries
    .map(query => query.data?.stop)
    .filter((stop): stop is StopMetadata => stop !== undefined)
    .filter(hasStopCoordinates)
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a

  // Suppress SSR warning from react-leaflet
  useEffect(() => {}, [])

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-raised border-b border-surface-border
        px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <p className="flex-1 text-[15px] font-semibold text-slate-100">
          Live vehicles
        </p>
        <FreshnessIndicator fetchedAt={vehiclesData?.fetchedAt ?? null} staleAfterMs={10_000} />
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        {/* Map */}
        <div className="rounded-xl overflow-hidden border border-surface-border"
          style={{ height: 280 }}>
          <MapContainer
            center={JKL_CENTRE}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <ZoomTracker onZoomChange={setMapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Stop markers */}
            {stops.map(stop => (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={stopIcon()}
              >
                <Popup>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                    <strong>{stop.name}</strong>
                    <br />
                    <span style={{ color: '#64748b' }}>Stop {stop.id}</span>
                  </div>
                </Popup>
              </Marker>
            ))}

<<<<<<< HEAD
            {/* Vehicle markers — from live hook, falls back to empty when loading */}
            {vehicles.map(v => (
=======
            {/* Vehicle markers */}
            {vehicles.map(v => {
              const label = routeLabel(v)
              const colour = ROUTE_COLOURS[label] ?? '#2979FF'

              return (
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
              <Marker
                key={v.vehicleId}
                position={[v.latitude, v.longitude]}
                icon={vehicleIcon(label, v.travelBearing ?? v.bearing, mapZoom)}
              >
                <Popup>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
<<<<<<< HEAD
                    <strong>Route {v.routeId}</strong>
                    {v.vehicleLabel && <> → {v.vehicleLabel}</>}
=======
                    <strong>Route {label}</strong>
                    {v.vehicleLabel && (
                      <> → {v.vehicleLabel}</>
                    )}
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
                    <br />
                    <span style={{ color: '#64748b' }}>{vehicleStatusLabel(v)}</span>
                  </div>
                </Popup>
                {v.currentStatus !== 'STOPPED_AT' && (
                  <Circle
                    center={[v.latitude, v.longitude]}
                    radius={40}
                    pathOptions={{
                      color: colour,
                      fillColor: colour,
                      fillOpacity: 0.08,
                      weight: 1,
                      opacity: 0.3,
                    }}
                  />
                )}
              </Marker>
              )
            })}
          </MapContainer>
        </div>

        {/* Vehicle list */}
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
          Nearby vehicles
        </p>
<<<<<<< HEAD

        {isLoading && (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface-raised border border-surface-border
                rounded-xl px-3.5 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-surface-overlay flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-surface-overlay rounded w-2/3" />
                  <div className="h-2.5 bg-surface-overlay rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && nearbyVehicles.length === 0 && (
          <div className="bg-surface-raised border border-surface-border
            rounded-xl px-4 py-6 flex flex-col items-center gap-2 text-center">
            <p className="text-[13px] text-slate-500">
              No vehicles nearby right now
            </p>
          </div>
        )}

        {!isLoading && nearbyVehicles.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {nearbyVehicles.map(v => (
              <VehicleListRow key={v.vehicleId} v={v} />
            ))}
          </div>
        )}
=======
        <div className="flex flex-col gap-2.5">
          {isVehiclesLoading ? (
            <p className="text-[13px] text-slate-500 py-4 text-center">
              Loading vehicles…
            </p>
          ) : isVehiclesError ? (
            <p className="text-[13px] text-rose-300 py-4 text-center">
              Vehicles could not be loaded.
            </p>
          ) : vehicles.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-4 text-center">
              No live vehicles available.
            </p>
          ) : vehicles.map(v => (
            <VehicleListRow key={v.vehicleId} v={v} />
          ))}
        </div>
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
      </div>
    </div>
  )
}
