// src/hooks/useDepartures.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchTripUpdates } from '../api/gtfs'
import { getDeparturesForStop, isFeedStale } from '../services/departures'
import type { Departure } from '../api/types'

interface UseDeparturesResult {
  departures: Departure[]
  isLoading: boolean
  isError: boolean
  isStale: boolean
  fetchedAt: number | null
  refetch: () => void
}

export function useDepartures(stopId: string): UseDeparturesResult {
  const query = useQuery({
    queryKey: ['tripUpdates'],
    queryFn: fetchTripUpdates,

    // Poll every 30s — matches Waltti API rate limit for TripUpdate feed
    refetchInterval: 30_000,

    // Keep showing previous data while refetching in the background
    // so the board never flashes empty during a refresh
    placeholderData: previousData => previousData,

    // Don't refetch just because the user switched tabs and came back —
    // the 30s interval is frequent enough
    refetchOnWindowFocus: false,
  })

  const departures = useMemo(() => {
    if (!query.data) return []
    return getDeparturesForStop(query.data.tripUpdates, stopId)
  }, [query.data, stopId])

  const isStale = query.data
    ? isFeedStale(query.data.fetchedAt)
    : false

  return {
    departures,
    isLoading:  query.isLoading,
    isError:    query.isError,
    isStale,
    fetchedAt:  query.data?.fetchedAt ?? null,
    refetch:    query.refetch,
  }
}