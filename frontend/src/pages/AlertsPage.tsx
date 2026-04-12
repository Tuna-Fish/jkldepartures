// src/pages/AlertsPage.tsx
import FreshnessIndicator from '../components/FreshnessIndicator'
import type { ServiceAlert } from '../api/types'

// ── Mock data ─────────────────────────────────────────────────────────────────
// Replace with useAlerts() hook in Step 4

const now = Math.floor(Date.now() / 1000)

const MOCK_ALERTS: ServiceAlert[] = [
  {
    id: 'alert-1',
    headerText: 'Route 4 — Significant delays',
    descriptionText:
      'Road works on Kauppakatu between Keskusta and Mattilanniemi. Delays of up to 8 minutes expected.',
    severity: 'WARNING',
    effect: 'SIGNIFICANT_DELAYS',
    activePeriods: [{ start: now - 3600, end: now + 7200 }],
    affectedRoutes: ['4'],
    affectedStops: ['1111', '2203'],
    url: undefined,
  },
  {
    id: 'alert-2',
    headerText: 'Route 1 — Partial cancellation',
    descriptionText:
      'Departures at 14:50 and 15:20 from Keskusta are cancelled due to driver shortage. Next scheduled departure at 15:50.',
    severity: 'SEVERE',
    effect: 'NO_SERVICE',
    activePeriods: [{ start: now - 1800, end: now + 3600 }],
    affectedRoutes: ['1'],
    affectedStops: ['1111'],
    url: undefined,
  },
  {
    id: 'alert-3',
    headerText: 'All routes — Resolved',
    descriptionText:
      'Morning delays on routes 7, 9 due to icy conditions. Resolved at 09:45.',
    severity: 'INFO',
    effect: 'MODIFIED_SERVICE',
    activePeriods: [{ start: now - 14400, end: now - 3600 }],
    affectedRoutes: ['7', '9'],
    affectedStops: [],
    url: undefined,
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

type SeverityLevel = ServiceAlert['severity']

const SEVERITY_STYLES: Record<SeverityLevel, {
  badge: string
  border: string
  label: string
}> = {
  SEVERE:  {
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
  return 'Active — no end time given'
}

function isResolved(alert: ServiceAlert): boolean {
  const nowSec = Date.now() / 1000
  return alert.activePeriods.every(p => p.end !== undefined && p.end < nowSec)
}

function AlertCard({ alert }: { alert: ServiceAlert }) {
  const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.UNKNOWN
  const resolved = isResolved(alert)
  const period = alert.activePeriods[0]

  return (
    <div className={`
      bg-surface-raised border rounded-xl px-4 py-3.5
      flex flex-col gap-3
      ${s.border}
      ${resolved ? 'opacity-60' : ''}
    `}>
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Affected route pills */}
        {alert.affectedRoutes.map(r => {
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

        <span className={`
          text-[10px] font-semibold px-2 py-0.5 rounded-md
          tracking-wide flex-shrink-0 ${s.badge}
        `}>
          {s.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-slate-400 leading-relaxed">
        {alert.descriptionText}
      </p>

      {/* Footer */}
      <p className="text-[11px] text-slate-600 border-t border-surface-border pt-2.5">
        {formatPeriod(period?.start, period?.end)}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const fetchedAt = Date.now()

  const active   = MOCK_ALERTS.filter(a => !isResolved(a))
  const resolved = MOCK_ALERTS.filter(a =>  isResolved(a))

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
        {active.length === 0 ? (
          <div className="bg-surface-raised border border-surface-border
            rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round"
              strokeLinejoin="round">
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
            <p className="text-[11px] font-semibold text-slate-500
              uppercase tracking-widest">
              Active now
            </p>
            {active.map(a => <AlertCard key={a.id} alert={a} />)}
          </>
        )}

        {resolved.length > 0 && (
          <>
            <p className="text-[11px] font-semibold text-slate-500
              uppercase tracking-widest mt-2">
              Earlier today
            </p>
            {resolved.map(a => <AlertCard key={a.id} alert={a} />)}
          </>
        )}
      </div>
    </div>
  )
}