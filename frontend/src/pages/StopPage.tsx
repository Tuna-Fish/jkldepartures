// src/pages/StopPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import DepartureBoard from '../components/DepartureBoard'
import AlertBanner from '../components/AlertBanner'
import FreshnessIndicator from '../components/FreshnessIndicator'
<<<<<<< HEAD
import { useDepartures } from '../hooks/useDepartures'
import { useAlerts } from '../hooks/useAlerts'

// ── Stop metadata ─────────────────────────────────────────────────────────────
// Replace with real static GTFS lookup when backend is ready

const STOP_META: Record<string, { name: string; subtitle: string }> = {
  '1111': { name: 'Keskusta (M)',  subtitle: 'Kauppakatu, platform A' },
  '2203': { name: 'Mattilanniemi', subtitle: 'Mattilanniemenkatu' },
  '3041': { name: 'Yliopisto',     subtitle: 'Seminaarinkatu' },
  '1084': { name: 'Hämeenkatu',    subtitle: 'Hämeenkatu' },
  '4012': { name: 'Keljonkangas',  subtitle: 'Keljonkaari' },
  '2110': { name: 'Tourula',       subtitle: 'Tourulankatu' },
  '5001': { name: 'Matkakeskus',   subtitle: 'Asemakatu' },
  '5102': { name: 'Kuokkala',      subtitle: 'Kuokkalantie' },
  '6201': { name: 'Seppälä',       subtitle: 'Seppälänkatu' },
  '6340': { name: 'Tikkakoski',    subtitle: 'Tikkakoskentie' },
}
=======
import type { AlertSeverity, ServiceAlert } from '../api/types'
import { useAlerts } from '../hooks/useAlerts'
import { useDepartures } from '../hooks/useDepartures'
import { useStop } from '../hooks/useStops'
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a

// ── Page ──────────────────────────────────────────────────────────────────────

function metadataValue(value: string | number | undefined): string {
  if (value === undefined || value === '') return 'Unknown'
  return String(value)
}

function wheelchairLabel(value: string | undefined): string | undefined {
  if (value === '1') return 'Accessible boarding'
  if (value === '2') return 'No accessible boarding'
  return undefined
}

function alertLevel(severity: AlertSeverity) {
  if (severity === 'SEVERE') return 'severe'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

function isResolved(alert: ServiceAlert): boolean {
  if (alert.activePeriods.length === 0) return false

  const nowSec = Date.now() / 1000
  return alert.activePeriods.every(p => p.end !== undefined && p.end < nowSec)
}

function isAlertForStop(alert: ServiceAlert, stopId: string): boolean {
  return alert.affectedStops.includes(stopId)
}

function alertTitle(alert: ServiceAlert): string {
  if (alert.affectedRoutes.length === 0) return alert.headerText

  return `Route ${alert.affectedRoutes.join(', ')} - ${alert.headerText}`
}

export default function StopPage() {
  const { stopId = '' } = useParams()
  const navigate = useNavigate()
  const {
    data: stopData,
    isLoading: isStopLoading,
    isError: isStopError,
  } = useStop(stopId)
  const { data: alertsData } = useAlerts()
  const {
    data: departuresData,
    isLoading,
    isError,
  } = useDepartures(stopId)

<<<<<<< HEAD
  const { departures, isLoading, isError, fetchedAt, isStale } =
    useDepartures(stopId)

  const { alertsForStop } = useAlerts()
  const stopAlerts = alertsForStop(stopId)

  const meta = STOP_META[stopId] ?? {
    name: `Stop ${stopId}`,
    subtitle: '',
  }
=======
  const stop = stopData?.stop
  const departures = departuresData?.departures ?? []
  const stopAlerts = (alertsData?.alerts ?? [])
    .filter(alert => !isResolved(alert) && isAlertForStop(alert, stopId))
  const stopName = stop?.name ?? (isStopLoading ? 'Loading stop…' : `Stop ${stopId}`)
  const fetchedAt = departuresData?.fetchedAt ?? stopData?.fetchedAt ?? null
  const coordinates = stop?.latitude !== undefined && stop.longitude !== undefined
    ? `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`
    : undefined
  const accessibility = wheelchairLabel(stop?.wheelchairBoarding)
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-raised border-b border-surface-border
        px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-surface-overlay border border-surface-border
            flex items-center justify-center flex-shrink-0
            hover:border-accent/50 transition-colors"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="flex-1 text-[15px] font-semibold text-slate-100 truncate">
          {stopName}
        </p>
        <FreshnessIndicator fetchedAt={fetchedAt} staleAfterMs={isStale ? 0 : 45_000} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        {/* Stop header card */}
        <div className="bg-surface-raised border border-surface-border
          rounded-xl px-4 py-3.5">
          <p className="text-[17px] font-bold text-slate-100">{stopName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="bg-surface-overlay rounded-md px-1.5 py-0.5
              text-[11px] font-bold font-display text-slate-500">
              {stopId}
            </span>
            {isStopError && (
              <span className="text-[12px] text-rose-300">
                Stop details could not be loaded
              </span>
            )}
          </div>
          {stop && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-3.5
              border-t border-surface-border">
              <div>
                <p className="text-[11px] text-slate-600">Zone</p>
                <p className="text-[13px] font-medium text-slate-300">
                  {metadataValue(stop.zoneId)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-600">Platform</p>
                <p className="text-[13px] font-medium text-slate-300">
                  {metadataValue(stop.platformCode)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-600">Municipality</p>
                <p className="text-[13px] font-medium text-slate-300">
                  {metadataValue(stop.municipalityId)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-600">Coordinates</p>
                <p className="text-[13px] font-medium text-slate-300">
                  {metadataValue(coordinates)}
                </p>
              </div>
              {accessibility && (
                <p className="col-span-2 text-[12px] text-slate-400">
                  {accessibility}
                </p>
              )}
            </div>
          )}
        </div>

<<<<<<< HEAD
        {/* Contextual alerts for this stop */}
        {stopAlerts.map(alert => (
          <AlertBanner
            key={alert.id}
            level={alert.severity.toLowerCase() as 'info' | 'warning' | 'severe'}
            title={alert.headerText}
            description={alert.descriptionText}
=======
        {stopAlerts.map(alert => (
          <AlertBanner
            key={alert.id}
            level={alertLevel(alert.severity)}
            title={alertTitle(alert)}
            description={alert.descriptionText || alert.effect.replaceAll('_', ' ')}
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
          />
        ))}

        {/* Departure board */}
        <DepartureBoard
          departures={departures}
          isLoading={isLoading}
          isError={isError}
        />
      </div>
    </div>
  )
}
