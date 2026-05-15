import type { Stop, StopsResult } from '../api/types'

const STOPS_URL = 'http://tunamasiina.freeddns.org:8081/api/stops'

interface BackendStop {
  stop_id?: string | number
  stopId?: string | number
  id?: string | number
  stop_name?: string
  stopName?: string
  name?: string
}

type StopsResponse = BackendStop[] | {
  stops?: BackendStop[]
  data?: BackendStop[]
  fetchedAt?: number
}

function getStopsFromResponse(data: StopsResponse): BackendStop[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.stops)) return data.stops
  if (Array.isArray(data.data)) return data.data
  return []
}

function toStop(stop: BackendStop): Stop | null {
  const id = stop.stop_id ?? stop.stopId ?? stop.id
  const name = stop.stop_name ?? stop.stopName ?? stop.name

  if (id === undefined || !name) return null

  return {
    id: String(id),
    name,
  }
}

export async function fetchStops(): Promise<StopsResult> {
  const response = await fetch(STOPS_URL, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Stops fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as StopsResponse

  return {
    stops: getStopsFromResponse(data)
      .map(toStop)
      .filter((stop): stop is Stop => stop !== null),
    fetchedAt: Array.isArray(data) ? Date.now() : data.fetchedAt ?? Date.now(),
  }
}
