// src/pages/StopPage.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import DepartureBoard from '../components/DepartureBoard'
import AlertBanner from '../components/AlertBanner'
import FreshnessIndicator from '../components/FreshnessIndicator'
import type { Departure } from '../api/types'
import { useStops } from '../hooks/useStops'

// ── Temporary mock data ───────────────────────────────────────────────────────
// Replace useMockDepartures() with useDepartures(stopId) in Step 4
// once the hooks layer is wired up.

function createMockDepartureSnapshot() {
  const fetchedAt = Date.now()
  const now = Math.floor(fetchedAt / 1000)

  return {
    fetchedAt,
    departures: [
      {
        tripId: 'trip-1', routeId: '4',
        headsign: 'Mattilanniemi',
        scheduledDeparture: now + 4 * 60,
        realtimeDeparture:  now + 8 * 60,   // 4 min late
        delaySeconds: 240, status: 'DELAYED',
        hasRealtime: true, platform: 'A',
      },
      {
        tripId: 'trip-2', routeId: '12',
        headsign: 'Keljonkangas',
        scheduledDeparture: now + 7 * 60,
        realtimeDeparture:  now + 7 * 60,
        delaySeconds: 0, status: 'ON_TIME',
        hasRealtime: true, platform: 'B',
      },
      {
        tripId: 'trip-3', routeId: '25',
        headsign: 'Seppälä',
        scheduledDeparture: now + 11 * 60,
        realtimeDeparture:  now + 11 * 60,
        delaySeconds: 0, status: 'ON_TIME',
        hasRealtime: true, platform: 'A',
      },
      {
        tripId: 'trip-4', routeId: '7',
        headsign: 'Kuokkala',
        scheduledDeparture: now + 14 * 60,
        realtimeDeparture:  now + 14 * 60,
        delaySeconds: 0, status: 'ON_TIME',
        hasRealtime: false, platform: 'C',
      },
      {
        tripId: 'trip-5', routeId: '1',
        headsign: 'Palokka',
        scheduledDeparture: now + 22 * 60,
        realtimeDeparture:  now + 22 * 60,
        delaySeconds: 0, status: 'CANCELLED',
        hasRealtime: true, platform: 'B',
      },
      {
        tripId: 'trip-6', routeId: '9',
        headsign: 'Tikkakoski',
        scheduledDeparture: now + 21 * 60,
        realtimeDeparture:  now + 21 * 60,
        delaySeconds: 0, status: 'NO_DATA',
        hasRealtime: false, platform: 'D',
      },
    ] satisfies Departure[],
  }
}

function useMockDepartures(): {
  departures: Departure[]
  isLoading: boolean
  isError: boolean
  fetchedAt: number | null
} {
  const [snapshot] = useState(createMockDepartureSnapshot)

  return {
    departures: snapshot.departures,
    isLoading: false,
    isError: false,
    fetchedAt: snapshot.fetchedAt,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StopPage() {
  const { stopId = '' } = useParams()
  const navigate = useNavigate()
  const {
    data: stopsData,
    isLoading: isStopLoading,
    isError: isStopError,
  } = useStops()

  const { departures, isLoading, isError, fetchedAt: departuresFetchedAt } =
    useMockDepartures()

  const stop = stopsData?.stops.find(candidate => candidate.id === stopId)
  const stopName = stop?.name ?? (isStopLoading ? 'Loading stop…' : `Stop ${stopId}`)
  const fetchedAt = stopsData?.fetchedAt ?? departuresFetchedAt

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
        <FreshnessIndicator fetchedAt={fetchedAt} />
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
        </div>

        {/* Contextual alert — shown only for stop 1111 as demo */}
        {stopId === '1111' && (
          <AlertBanner
            level="warning"
            title="Route 4 — delays expected"
            description="Road works on Kauppakatu until 18:00"
          />
        )}

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
