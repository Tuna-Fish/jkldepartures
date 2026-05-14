// src/services/alerts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions for filtering and classifying service alerts.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceAlert } from '../api/types'

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true if the alert is currently active.
 * An alert is active if at least one of its active periods
 * overlaps with the current time.
 */
export function isAlertActive(
  alert: ServiceAlert,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (alert.activePeriods.length === 0) return true  // no period = always active

  return alert.activePeriods.some(period => {
    const startOk = period.start === undefined || period.start <= nowSeconds
    const endOk   = period.end   === undefined || period.end   >= nowSeconds
    return startOk && endOk
  })
}

/**
 * Returns true if the alert has fully expired.
 */
export function isAlertResolved(
  alert: ServiceAlert,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (alert.activePeriods.length === 0) return false
  return alert.activePeriods.every(
    p => p.end !== undefined && p.end < nowSeconds
  )
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/**
 * Returns only alerts that are currently active.
 */
export function getActiveAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  return alerts.filter(a => isAlertActive(a))
}

/**
 * Returns alerts that have ended within the last 4 hours.
 * Used for the "Earlier today" section.
 */
export function getRecentlyResolvedAlerts(
  alerts: ServiceAlert[],
  windowSeconds: number = 4 * 60 * 60
): ServiceAlert[] {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return alerts.filter(alert => {
    if (!isAlertResolved(alert)) return false
    const latestEnd = Math.max(
      ...alert.activePeriods
        .map(p => p.end ?? 0)
    )
    return latestEnd >= nowSeconds - windowSeconds
  })
}

/**
 * Returns alerts relevant to a specific stop —
 * either directly affecting the stop, or affecting a route that serves it.
 */
export function getAlertsForStop(
  alerts: ServiceAlert[],
  stopId: string,
  routeIds: string[] = []
): ServiceAlert[] {
  return alerts.filter(alert => {
    const affectsStop  = alert.affectedStops.includes(stopId)
    const affectsRoute = routeIds.some(r => alert.affectedRoutes.includes(r))
    return affectsStop || affectsRoute
  })
}

/**
 * Returns alerts for a specific route.
 */
export function getAlertsForRoute(
  alerts: ServiceAlert[],
  routeId: string
): ServiceAlert[] {
  return alerts.filter(a => a.affectedRoutes.includes(routeId))
}

// ── Severity sorting ──────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<ServiceAlert['severity'], number> = {
  SEVERE:  0,
  WARNING: 1,
  INFO:    2,
  UNKNOWN: 3,
}

/**
 * Sorts alerts by severity (SEVERE first) then by start time (newest first).
 */
export function sortAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  return [...alerts].sort((a, b) => {
    const severityDiff =
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
    if (severityDiff !== 0) return severityDiff

    // Same severity — sort by most recent start time
    const aStart = a.activePeriods[0]?.start ?? 0
    const bStart = b.activePeriods[0]?.start ?? 0
    return bStart - aStart
  })
}

/**
 * Returns the highest severity level present in a list of alerts.
 * Useful for showing a summary badge on the nav tab.
 */
export function highestSeverity(
  alerts: ServiceAlert[]
): ServiceAlert['severity'] {
  if (alerts.length === 0) return 'UNKNOWN'
  return alerts.reduce((highest, alert) => {
    return (SEVERITY_ORDER[alert.severity] ?? 3) 
           < (SEVERITY_ORDER[highest] ?? 3)
      ? alert.severity
      : highest
  }, 'UNKNOWN' as ServiceAlert['severity'])
}