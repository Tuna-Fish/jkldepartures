// src/hooks/useDepartures.ts
import { useQuery } from '@tanstack/react-query'
import { fetchDepartures } from '../api/departures'
import type { DeparturesResult } from '../api/types'

const STALE_THRESHOLD_SECONDS = 90

interface UseDeparturesResult {
  data: DeparturesResult | undefined
  departures: DeparturesResult['departures']
  isLoading: boolean
  isError: boolean
  isStale: boolean
  fetchedAt: number | null
  refetch: () => void
}

export function useDepartures(stopId: string): UseDeparturesResult {
  const query = useQuery({
    queryKey: ['departures', stopId],
    queryFn: () => fetchDepartures(stopId),
    refetchInterval: 30_000,
    placeholderData: previousData => previousData,
    refetchOnWindowFocus: false,
    enabled: stopId.length > 0,
  })

  const fetchedAt = query.data?.fetchedAt ?? null

  // isStale is derived purely from the query result data — no Date.now() at
  // render time. The stale check runs only when fetchedAt changes, not on
  // every render tick.
  const isStale = fetchedAt !== null && (
    (query.dataUpdatedAt - fetchedAt) / 1000 > STALE_THRESHOLD_SECONDS
  )

  return {
    data:       query.data,
    departures: query.data?.departures ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    isStale,
    fetchedAt,
    refetch:    query.refetch,
  }
}