// src/hooks/useAlerts.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchServiceAlerts } from '../api/gtfs'
import {
  getActiveAlerts,
  getRecentlyResolvedAlerts,
  getAlertsForStop,
  sortAlerts,
  highestSeverity,
} from '../services/alerts'
import type { ServiceAlert } from '../api/types'

interface UseAlertsResult {
  // All currently active alerts, sorted by severity
  active: ServiceAlert[]
  // Alerts that ended within the last 4 hours
  recentlyResolved: ServiceAlert[]
  // Active alerts filtered to a specific stop + its routes
  alertsForStop: (stopId: string, routeIds?: string[]) => ServiceAlert[]
  // Highest severity among active alerts — for the nav badge
  severity: ServiceAlert['severity']
  // Total count of active alerts — for the nav badge number
  activeCount: number
  isLoading: boolean
  isError: boolean
  fetchedAt: number | null
  refetch: () => void
}

export function useAlerts(): UseAlertsResult {
  const query = useQuery({
    queryKey: ['serviceAlerts'],
    queryFn: fetchServiceAlerts,

    // Poll every 60s — matches Waltti API rate limit for ServiceAlert feed
    refetchInterval: 60_000,

    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
  })

  const active = useMemo(() => {
    if (!query.data) return []
    return sortAlerts(getActiveAlerts(query.data.alerts))
  }, [query.data])

  const recentlyResolved = useMemo(() => {
    if (!query.data) return []
    return getRecentlyResolvedAlerts(query.data.alerts)
  }, [query.data])

  const alertsForStop = useMemo(() => {
    return (stopId: string, routeIds: string[] = []) => {
      if (!query.data) return []
      return getAlertsForStop(active, stopId, routeIds)
    }
  }, [query.data, active])

  return {
    active,
    recentlyResolved,
    alertsForStop,
    severity:    highestSeverity(active),
    activeCount: active.length,
    isLoading:   query.isLoading,
    isError:     query.isError,
    fetchedAt:   query.data?.fetchedAt ?? null,
    refetch:     query.refetch,
  }
}