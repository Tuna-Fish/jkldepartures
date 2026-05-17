// src/pages/HomePage.tsx
import AlertBanner from '../components/AlertBanner'
import StopSearch from '../components/StopSearch'
import { useAlerts } from '../hooks/useAlerts'
import type { AlertSeverity, ServiceAlert } from '../api/types'

function alertLevel(severity: AlertSeverity) {
  if (severity === 'SEVERE') return 'severe'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

function isResolved(alert: ServiceAlert) {
  if (alert.activePeriods.length === 0) return false

  const nowSec = Date.now() / 1000
  return alert.activePeriods.every(p => p.end !== undefined && p.end < nowSec)
}

function alertTitle(alert: ServiceAlert) {
  if (alert.affectedRoutes.length === 0) return alert.headerText
  return `Route ${alert.affectedRoutes.join(', ')} — ${alert.headerText}`
}

export default function HomePage() {
  const { data: alertsData } = useAlerts()
  const activeAlerts = (alertsData?.alerts ?? []).filter(alert => !isResolved(alert))
  const alert = activeAlerts[0]

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      {/* Hero */}
      <div className="pt-8 pb-2 flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-100">
          Good morning
        </h1>
        <p className="text-[13px] text-slate-500">
          Jyväskylä public transport
        </p>
      </div>

      {/* Search + recent stops */}
      <StopSearch />

      {alert && (
        <AlertBanner
          level={alertLevel(alert.severity)}
          title={alertTitle(alert)}
          description={alert.descriptionText || alert.effect.replaceAll('_', ' ')}
        />
      )}
    </div>
  )
}