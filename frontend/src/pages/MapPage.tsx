// src/pages/MapPage.tsx
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import FreshnessIndicator from '../components/FreshnessIndicator'
import type { StopMetadata, VehiclePosition } from '../api/types'
import { useStopMarkers } from '../hooks/useStops'
import { useVehicles } from '../hooks/useVehicles'

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Custom vehicle marker ─────────────────────────────────────────────────────

const ROUTE_COLOURS: Record<string, string> = {
  '1': '#C62828', '4': '#1565C0', '7': '#E65100',
  '9': '#00695C', '12': '#2E7D32', '25': '#6A1B9A',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function markerZoomScale(zoom: number): number {
  return clamp(0.68 + (zoom - 12) * 0.16, 0.68, 1.8)
}

function vehicleIcon(routeId: string, bearing?: number, zoom = 14) {
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
          {statusLabel(v)}
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

// Jyväskylä city centre
const JKL_CENTRE: [number, number] = [62.2415, 25.7482]

export default function MapPage() {
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

            {/* Vehicle markers */}
            {vehicles.map(v => {
              const label = routeLabel(v)
              const colour = ROUTE_COLOURS[label] ?? '#2979FF'

              return (
              <Marker
                key={v.vehicleId}
                position={[v.latitude, v.longitude]}
                icon={vehicleIcon(label, v.travelBearing ?? v.bearing, mapZoom)}
              >
                <Popup>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                    <strong>Route {label}</strong>
                    {v.vehicleLabel && (
                      <> → {v.vehicleLabel}</>
                    )}
                    <br />
                    <span style={{ color: '#64748b' }}>{statusLabel(v)}</span>
                  </div>
                </Popup>
                {/* Pulse ring for moving vehicles */}
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
        <p className="text-[11px] font-semibold text-slate-500
          uppercase tracking-widest">
          Nearby vehicles
        </p>
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
      </div>
    </div>
  )
}
