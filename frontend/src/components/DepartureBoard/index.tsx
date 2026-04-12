// src/components/DepartureBoard/index.tsx
import type { Departure } from '../../api/types'

interface DepartureBoardProps {
  departures: Departure[]
  isLoading: boolean
  isError: boolean
}

// Route number → colour pair
// Cycles through 6 colours by route number hash so the same
// route always gets the same colour across refreshes.
const ROUTE_COLOURS = [
  { bg: '#1565C0', text: '#bbdefb' },  // blue
  { bg: '#2E7D32', text: '#c8e6c9' },  // green
  { bg: '#6A1B9A', text: '#e1bee7' },  // purple
  { bg: '#E65100', text: '#ffe0b2' },  // orange
  { bg: '#00695C', text: '#b2dfdb' },  // teal
  { bg: '#C62828', text: '#ffcdd2' },  // red
]

function routeColour(routeId: string) {
  let hash = 0
  for (let i = 0; i < routeId.length; i++) {
    hash = routeId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ROUTE_COLOURS[Math.abs(hash) % ROUTE_COLOURS.length]
}

function StatusPill({ status, delaySeconds }: {
  status: Departure['status']
  delaySeconds: number
}) {
  if (status === 'CANCELLED')
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
        bg-[#3a1010] text-[#f87171] tracking-wide">
        Cancelled
      </span>
    )
  if (status === 'NO_DATA')
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
        bg-surface-overlay text-slate-500 tracking-wide">
        No data
      </span>
    )
  if (status === 'DELAYED') {
    const mins = Math.round(delaySeconds / 60)
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
        bg-[#3a2a00] text-[#fbbf24] tracking-wide">
        +{mins} min
      </span>
    )
  }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
      bg-[#1a3a1a] text-[#4ade80] tracking-wide">
      On time
    </span>
  )
}

function CountdownDisplay({ dep }: { dep: Departure }) {
  if (dep.status === 'CANCELLED') {
    const scheduled = new Date(dep.scheduledDeparture * 1000)
    const hhmm = scheduled.toLocaleTimeString('fi-FI', {
      hour: '2-digit', minute: '2-digit',
    })
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-[16px] font-bold font-display text-slate-500 line-through">
          {hhmm}
        </span>
        <span className="text-[11px] text-slate-600 font-display">sched.</span>
      </div>
    )
  }

  const nowSeconds = Date.now() / 1000
  const minsAway = Math.round((dep.realtimeDeparture - nowSeconds) / 60)
  const departureTime = new Date(dep.realtimeDeparture * 1000)
  const hhmm = departureTime.toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit',
  })

  const countdownColour =
    minsAway <= 1 ? 'text-status-delayed' :
    minsAway <= 5 ? 'text-status-ontime' :
    'text-slate-100'

  return (
    <div className="flex flex-col items-end gap-1">
      {minsAway <= 0 ? (
        <span className={`text-[16px] font-bold font-display ${countdownColour}`}>
          Now
        </span>
      ) : (
        <span className={`text-[20px] font-bold font-display leading-none ${countdownColour}`}>
          {minsAway}
          <span className="text-[12px] font-normal"> min</span>
        </span>
      )}
      <span className="text-[11px] text-slate-500 font-display">{hhmm}</span>
    </div>
  )
}

function DepartureCard({ dep }: { dep: Departure }) {
  const colour = routeColour(dep.routeId)
  const isCancelled = dep.status === 'CANCELLED'

  return (
    <div className={`
      bg-surface-raised border border-surface-border rounded-xl
      px-3.5 py-3 flex gap-3 items-stretch
      transition-colors duration-150 hover:border-accent/40
      ${isCancelled ? 'opacity-55 border-dashed' : ''}
    `}>
      {/* Route pill */}
      <div
        className="w-11 rounded-lg flex items-center justify-center
          text-[15px] font-bold font-display flex-shrink-0 min-h-[44px]"
        style={{ backgroundColor: colour.bg, color: colour.text }}
      >
        {dep.routeId}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-100 truncate">
          {dep.headsign || 'Unknown destination'}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={dep.status} delaySeconds={dep.delaySeconds} />
          {!dep.hasRealtime && dep.status !== 'CANCELLED' && (
            <span className="text-[11px] text-slate-600">scheduled</span>
          )}
        </div>
        {dep.platform && (
          <p className="text-[11px] text-slate-600">
            Platform {dep.platform}
          </p>
        )}
      </div>

      {/* Countdown */}
      <CountdownDisplay dep={dep} />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl
      px-3.5 py-3 flex gap-3 items-center animate-pulse">
      <div className="w-11 h-11 rounded-lg bg-surface-overlay flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3.5 bg-surface-overlay rounded w-2/3" />
        <div className="h-2.5 bg-surface-overlay rounded w-1/3" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-5 bg-surface-overlay rounded w-12" />
        <div className="h-2.5 bg-surface-overlay rounded w-8" />
      </div>
    </div>
  )
}

export default function DepartureBoard({
  departures,
  isLoading,
  isError,
}: DepartureBoardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-surface-raised border border-surface-border rounded-xl
        px-4 py-8 flex flex-col items-center gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#f87171" strokeWidth={1.5} strokeLinecap="round"
          strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-[14px] font-semibold text-slate-300">
          Could not load departures
        </p>
        <p className="text-[12px] text-slate-500">
          Check your connection and try again
        </p>
      </div>
    )
  }

  if (departures.length === 0) {
    return (
      <div className="bg-surface-raised border border-surface-border rounded-xl
        px-4 py-8 flex flex-col items-center gap-2 text-center">
        <p className="text-[14px] font-semibold text-slate-400">
          No upcoming departures
        </p>
        <p className="text-[12px] text-slate-500">
          This stop has no departures in the next hour
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {departures.map((dep) => (
        <DepartureCard key={`${dep.tripId}-${dep.scheduledDeparture}`} dep={dep} />
      ))}
    </div>
  )
}