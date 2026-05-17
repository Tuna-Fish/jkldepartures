// src/hooks/useAlerts.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ServiceAlert, AlertsResult } from '../api/types'

const BASE_URL = 'http://tunamasiina.freeddns.org:8081'

// ── Severity ordering ─────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<ServiceAlert['severity'], number> = {
  SEVERE:  0,
  WARNING: 1,
  INFO:    2,
  UNKNOWN: 3,
}

// ── Alert helpers ─────────────────────────────────────────────────────────────

function isAlertActive(alert: ServiceAlert, nowSeconds: number): boolean {
  if (alert.activePeriods.length === 0) return true
  return alert.activePeriods.some(period => {
    const startOk = period.start === undefined || period.start <= nowSeconds
    const endOk   = period.end   === undefined || period.end   >= nowSeconds
    return startOk && endOk
  })
}

function isAlertResolved(alert: ServiceAlert, nowSeconds: number): boolean {
  if (alert.activePeriods.length === 0) return false
  return alert.activePeriods.every(
    p => p.end !== undefined && p.end < nowSeconds
  )
}

function sortAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  return [...alerts].sort((a, b) => {
    const severityDiff =
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
    if (severityDiff !== 0) return severityDiff
    const aStart = a.activePeriods[0]?.start ?? 0
    const bStart = b.activePeriods[0]?.start ?? 0
    return bStart - aStart
  })
}

// ── Translation helpers ───────────────────────────────────────────────────────

function pickTranslation(translated: unknown): string {
  if (!translated || typeof translated !== 'object') return ''
  const t = translated as { translation?: Array<{ text?: string; language?: string }> }
  if (!t.translation?.length) return ''
  const fi = t.translation.find(x => x.language === 'fi')
  return (fi ?? t.translation[0])?.text ?? ''
}

function mapSeverity(val: unknown): ServiceAlert['severity'] {
  if (val === 2) return 'INFO'
  if (val === 3) return 'WARNING'
  if (val === 4) return 'SEVERE'
  return 'UNKNOWN'
}

function mapEffect(val: unknown): ServiceAlert['effect'] {
  const effects: Record<number, ServiceAlert['effect']> = {
    1: 'NO_SERVICE', 2: 'REDUCED_SERVICE', 3: 'SIGNIFICANT_DELAYS',
    4: 'DETOUR', 5: 'ADDITIONAL_SERVICE', 6: 'MODIFIED_SERVICE',
    7: 'OTHER_EFFECT', 8: 'UNKNOWN_EFFECT', 9: 'STOP_MOVED',
  }
  return effects[val as number] ?? 'UNKNOWN_EFFECT'
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchAlerts(): Promise<AlertsResult> {
  const response = await fetch(`${BASE_URL}/api/alerts`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Alerts fetch failed: ${response.status} ${response.statusText}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await response.json() as { fetchedAt: number; alerts: any[] }

  const alerts: ServiceAlert[] = (raw.alerts ?? []).map((a): ServiceAlert => ({
    id:              a.id ?? '',
    headerText:      pickTranslation(a.header_text) || '',
    descriptionText: pickTranslation(a.description_text) || '',
    severity:        mapSeverity(a.severity_level),
    effect:          mapEffect(a.effect),
    url:             pickTranslation(a.url) || undefined,
    activePeriods:   (a.active_period ?? []).map((p: { start?: number; end?: number }) => ({
      start: p.start,
      end:   p.end,
    })),
    affectedRoutes: (a.informed_entity ?? [])
      .map((ie: { route_id?: string }) => ie.route_id)
      .filter(Boolean),
    affectedStops: (a.informed_entity ?? [])
      .map((ie: { stop_id?: string }) => ie.stop_id)
      .filter(Boolean),
  }))

  return { alerts, fetchedAt: raw.fetchedAt }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseAlertsResult {
  data: AlertsResult | undefined
  active: ServiceAlert[]
  recentlyResolved: ServiceAlert[]
  alertsForStop: (stopId: string, routeIds?: string[]) => ServiceAlert[]
  severity: ServiceAlert['severity']
  activeCount: number
  isLoading: boolean
  isError: boolean
  fetchedAt: number | null
  refetch: () => void
}

export function useAlerts(): UseAlertsResult {
  const query = useQuery({
    queryKey: ['serviceAlerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60_000,
    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
  })
// Derive nowSeconds purely from React Query's dataUpdatedAt timestamp.
  // This is set by React Query when data arrives and is stable between renders,
  // so no impure Date.now() call is needed anywhere in this hook.
  const nowSeconds = query.dataUpdatedAt > 0
    ? Math.floor(query.dataUpdatedAt / 1000)
    : 0

  const active = useMemo(() => {
    if (!query.data) return []
    return sortAlerts(query.data.alerts.filter(a => isAlertActive(a, nowSeconds)))
  }, [query.data, nowSeconds])

  const recentlyResolved = useMemo(() => {
    if (!query.data) return []
    const windowSeconds = 4 * 60 * 60
    return query.data.alerts.filter(alert => {
      if (!isAlertResolved(alert, nowSeconds)) return false
      const latestEnd = Math.max(...alert.activePeriods.map(p => p.end ?? 0))
      return latestEnd >= nowSeconds - windowSeconds
    })
  }, [query.data, nowSeconds])

  const alertsForStop = useMemo(() => {
    return (stopId: string, routeIds: string[] = []) =>
      active.filter(alert =>
        alert.affectedStops.includes(stopId) ||
        routeIds.some(r => alert.affectedRoutes.includes(r))
      )
  }, [active])

  const severity: ServiceAlert['severity'] = active.length === 0
    ? 'UNKNOWN'
    : active.reduce((highest, alert) =>
        (SEVERITY_ORDER[alert.severity] ?? 3) < (SEVERITY_ORDER[highest] ?? 3)
          ? alert.severity
          : highest
      , 'UNKNOWN' as ServiceAlert['severity'])

  return {
    data:             query.data,
    active,
    recentlyResolved,
    alertsForStop,
    severity,
    activeCount:      active.length,
    isLoading:        query.isLoading,
    isError:          query.isError,
    fetchedAt:        query.data?.fetchedAt ?? null,
    refetch:          query.refetch,
  }
}