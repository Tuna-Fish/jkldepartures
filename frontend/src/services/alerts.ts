import type {
  AlertEffect,
  AlertSeverity,
  RawAlertResult,
  ServiceAlert,
} from '../api/types'

const ALERTS_URL = 'http://tunamasiina.freeddns.org:8081/api/alerts'

interface Translation {
  language?: string
  text?: string
}

interface TranslatedText {
  translation?: Translation[]
}

interface BackendAlert {
  id?: string
  active_period?: Array<{ start?: number; end?: number }>
  activePeriods?: ServiceAlert['activePeriods']
  description_text?: TranslatedText
  descriptionText?: string
  effect?: number | AlertEffect
  header_text?: TranslatedText
  headerText?: string
  informed_entity?: Array<{
    route_id?: string
    stop_id?: string
  }>
  severity_level?: number
  severity?: AlertSeverity
  url?: TranslatedText | string
  affectedRoutes?: string[]
  affectedStops?: string[]
}

type AlertsResponse = BackendAlert[] | {
  alerts?: BackendAlert[]
  data?: BackendAlert[]
  fetchedAt?: number
}

function pickTranslation(translated?: TranslatedText): string {
  if (!translated?.translation?.length) return ''
  const fi = translated.translation.find(t => t.language === 'fi')
  return (fi ?? translated.translation[0])?.text ?? ''
}

function mapAlertSeverity(value: number | AlertSeverity | undefined): AlertSeverity {
  if (typeof value === 'string') return value

  switch (value) {
    case 2:  return 'INFO'
    case 3:  return 'WARNING'
    case 4:  return 'SEVERE'
    default: return 'UNKNOWN'
  }
}

function mapAlertEffect(value: number | AlertEffect | undefined): AlertEffect {
  if (typeof value === 'string') return value

  const effects: Record<number, AlertEffect> = {
    1: 'NO_SERVICE',
    2: 'REDUCED_SERVICE',
    3: 'SIGNIFICANT_DELAYS',
    4: 'DETOUR',
    5: 'ADDITIONAL_SERVICE',
    6: 'MODIFIED_SERVICE',
    7: 'OTHER_EFFECT',
    8: 'UNKNOWN_EFFECT',
    9: 'STOP_MOVED',
  }

  return effects[value ?? -1] ?? 'UNKNOWN_EFFECT'
}

function getUrl(url?: TranslatedText | string): string | undefined {
  const value = typeof url === 'string' ? url : pickTranslation(url)
  return value || undefined
}

function toServiceAlert(alert: BackendAlert, index: number): ServiceAlert {
  const informedEntities = alert.informed_entity ?? []

  return {
    id: alert.id ?? `alert-${index}`,
    headerText: alert.headerText ?? pickTranslation(alert.header_text),
    descriptionText: alert.descriptionText ?? pickTranslation(alert.description_text),
    severity: alert.severity ?? mapAlertSeverity(alert.severity_level),
    effect: mapAlertEffect(alert.effect),
    activePeriods: alert.activePeriods ?? alert.active_period ?? [],
    affectedRoutes: alert.affectedRoutes ?? informedEntities
      .map(entity => entity.route_id)
      .filter(routeId => routeId !== undefined),
    affectedStops: alert.affectedStops ?? informedEntities
      .map(entity => entity.stop_id)
      .filter(stopId => stopId !== undefined),
    url: getUrl(alert.url),
  }
}

function getAlertsFromResponse(data: AlertsResponse): BackendAlert[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.alerts)) return data.alerts
  if (Array.isArray(data.data)) return data.data
  return []
}

export async function fetchAlerts(): Promise<RawAlertResult> {
  const response = await fetch(ALERTS_URL, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Alerts fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as AlertsResponse

  return {
    alerts: getAlertsFromResponse(data).map(toServiceAlert),
    fetchedAt: Array.isArray(data) ? Date.now() : data.fetchedAt ?? Date.now(),
  }
}
