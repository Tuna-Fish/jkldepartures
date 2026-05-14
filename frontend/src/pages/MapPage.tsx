// src/pages/MapPage.tsx
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import FreshnessIndicator from '../components/FreshnessIndicator'
import { useVehiclePositions } from '../hooks/useVehiclePositions'
import { vehicleStatusLabel } from '../services/vehicles'
import type { VehiclePosition } from '../api/types'

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

const MOCK_STOPS = [
  { id: '1111', name: 'Keskusta (M)', lat: 62.2415, lng: 25.7482 },
  { id: '3041', name: 'Yliopisto',    lat: 62.2320, lng: 25.7598 },
  { id: '1084', name: 'Hämeenkatu',  lat: 62.2501, lng: 25.7308 },
]

// ── Icon factories ────────────────────────────────────────────────────────────

function vehicleIcon(routeId: string) {
  const colour = ROUTE_COLOURS[routeId] ?? '#2979FF'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="13" fill="${colour}" opacity="0.25"/>
      <circle cx="16" cy="16" r="9" fill="${colour}"/>
      <text x="16" y="20" text-anchor="middle"
        font-family="DM Mono,monospace" font-size="9"
        font-weight="700" fill="white">${routeId}</text>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
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

function VehicleListRow({ v }: { v: VehiclePosition }) {
  const colour = ROUTE_COLOURS[v.routeId ?? ''] ?? '#2979FF'
  const moving = v.currentStatus !== 'STOPPED_AT'

  return (
    <div className="bg-surface-raised border border-surface-border
      rounded-xl px-3.5 py-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center
          text-[13px] font-bold font-display flex-shrink-0"
        style={{ backgroundColor: colour, color: '#fff' }}
      >
        {v.routeId}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-100 truncate">
          Route {v.routeId}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { vehicles, nearCoordinate, isLoading, fetchedAt } =
    useVehiclePositions()

  const nearbyVehicles = nearCoordinate(JKL_CENTRE[0], JKL_CENTRE[1])

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
        <FreshnessIndicator fetchedAt={fetchedAt} staleAfterMs={10_000} />
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
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Stop markers */}
            {MOCK_STOPS.map(stop => (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
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

            {/* Vehicle markers — from live hook, falls back to empty when loading */}
            {vehicles.map(v => (
              <Marker
                key={v.vehicleId}
                position={[v.latitude, v.longitude]}
                icon={vehicleIcon(v.routeId ?? '?')}
              >
                <Popup>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                    <strong>Route {v.routeId}</strong>
                    {v.vehicleLabel && <> → {v.vehicleLabel}</>}
                    <br />
                    <span style={{ color: '#64748b' }}>{vehicleStatusLabel(v)}</span>
                  </div>
                </Popup>
                {v.currentStatus !== 'STOPPED_AT' && (
                  <Circle
                    center={[v.latitude, v.longitude]}
                    radius={40}
                    pathOptions={{
                      color: ROUTE_COLOURS[v.routeId ?? ''] ?? '#2979FF',
                      fillColor: ROUTE_COLOURS[v.routeId ?? ''] ?? '#2979FF',
                      fillOpacity: 0.08,
                      weight: 1,
                      opacity: 0.3,
                    }}
                  />
                )}
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Vehicle list */}
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
          Nearby vehicles
        </p>

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
      </div>
    </div>
  )
}
