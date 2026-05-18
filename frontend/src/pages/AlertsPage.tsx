// src/pages/AlertsPage.tsx
import FreshnessIndicator from '../components/FreshnessIndicator'
import type { ServiceAlert } from '../api/types'
import { useAlerts } from '../hooks/useAlerts'

// ── Sub-components ────────────────────────────────────────────────────────────

type SeverityLevel = ServiceAlert['severity']

const SEVERITY_STYLES: Record<SeverityLevel, {
  badge: string
  border: string
  label: string
}> = {
  SEVERE: {
    badge:  'bg-[#3a1010] text-[#f87171]',
    border: 'border-[#7f1d1d]',
    label:  'SEVERE',
  },
  WARNING: {
    badge:  'bg-[#3a2a00] text-[#fbbf24]',
    border: 'border-[#78350f]',
    label:  'WARNING',
  },
  INFO: {
    badge:  'bg-[#1a3a1a] text-[#4ade80]',
    border: 'border-surface-border',
    label:  'INFO',
  },
  UNKNOWN: {
    badge:  'bg-surface-overlay text-slate-500',
    border: 'border-surface-border',
    label:  'UNKNOWN',
  },
}

const ROUTE_COLOURS: Record<string, { bg: string; text: string }> = {
  '1':  { bg: '#C62828', text: '#ffcdd2' },
  '4':  { bg: '#1565C0', text: '#bbdefb' },
  '7':  { bg: '#E65100', text: '#ffe0b2' },
  '9':  { bg: '#00695C', text: '#b2dfdb' },
  '12': { bg: '#2E7D32', text: '#c8e6c9' },
  '25': { bg: '#6A1B9A', text: '#e1bee7' },
}

function routeColour(routeId: string) {
  return ROUTE_COLOURS[routeId] ?? { bg: '#1e2535', text: '#94a3b8' }
}

function formatPeriod(start?: number, end?: number): string {
  const nowSec = Date.now() / 1000
  if (end && end < nowSec) {
    const d = new Date(end * 1000)
    return `Ended ${d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (end) {
    const d = new Date(end * 1000)
    return `Active until ${d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })} today`
  }
  if (start) {
    const d = new Date(start * 1000)
    return `Active since ${d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`
  }
  return 'Active — no end time given'
}

function isResolved(alert: ServiceAlert): boolean {
  if (alert.activePeriods.length === 0) return false

  const nowSec = Date.now() / 1000
  return alert.activePeriods.every(p => p.end !== undefined && p.end < nowSec)
}

function AlertCard({ alert }: { alert: ServiceAlert }) {
  const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.UNKNOWN
  const resolved = isResolved(alert)
  const period = alert.activePeriods[0]

  return (
    <div
      className={`
        bg-surface-raised border rounded-xl px-4 py-3.5
        flex flex-col gap-3
        ${s.border}
        ${resolved ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {alert.affectedRoutes.map((r) => {
          const c = routeColour(r)
          return (
            <span
              key={r}
              className="text-[13px] font-bold font-display px-2 py-0.5 rounded-md flex-shrink-0"
              style={{ backgroundColor: c.bg, color: c.text }}
            >
              {r}
            </span>
          )
        })}
        <p className="text-[14px] font-semibold text-slate-100 flex-1 min-w-0">
          {alert.headerText}
        </p>
        <span
          className={`
            text-[10px] font-semibold px-2 py-0.5 rounded-md
            tracking-wide flex-shrink-0 ${s.badge}
          `}
        >
          {s.label}
        </span>
      </div>

      <p className="text-[13px] text-slate-400 leading-relaxed">
        {alert.descriptionText}
      </p>

      <p className="text-[11px] text-slate-600 border-t border-surface-border pt-2.5">
        {formatPeriod(period?.end)}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data: alerts, isLoading, isError } = useAlerts()
  const fetchedAt = null
  const safeAlerts = alerts?.alerts ?? []

  const active   = safeAlerts.filter((a: ServiceAlert) => !isResolved(a))
  const resolved = safeAlerts.filter((a: ServiceAlert) =>  isResolved(a))

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-raised border-b border-surface-border
        px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <p className="flex-1 text-[15px] font-semibold text-slate-100">
          Service alerts
        </p>
        <FreshnessIndicator fetchedAt={fetchedAt} staleAfterMs={90_000} />
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        {isLoading ? (
          <div className="bg-surface-raised border border-surface-border
            rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
            <p className="text-[14px] font-semibold text-slate-300">
              Loading service alerts
            </p>
            <p className="text-[12px] text-slate-500">
              Checking the latest disruptions
            </p>
          </div>
        ) : isError ? (
          <div className="bg-surface-raised border border-[#7f1d1d]
            rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
            <p className="text-[14px] font-semibold text-[#fca5a5]">
              Could not load service alerts
            </p>
            <p className="text-[12px] text-slate-500">
              The alerts backend is not reachable right now
            </p>
          </div>
        ) : active.length === 0 ? (
          <div className="bg-surface-raised border border-surface-border
            rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#4ade80" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-[14px] font-semibold text-slate-300">
              No active disruptions
            </p>
            <p className="text-[12px] text-slate-500">
              All routes are running normally
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
              Active now
            </p>
            {active.map((a: ServiceAlert) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </>
        )}

        {resolved.length > 0 && (
          <>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">
              Earlier today
            </p>
            {resolved.map((a: ServiceAlert) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
