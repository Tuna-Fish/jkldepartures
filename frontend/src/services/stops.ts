import type { Stop, StopMetadata, StopMetadataResult, StopsResult } from '../api/types'

const STOPS_URL = 'http://tunamasiina.freeddns.org:8081/api/stops'

interface BackendStop {
  stop_id?: string | number
  stopId?: string | number
  id?: string | number
  stop_name?: string
  stopName?: string
  name?: string
}

interface BackendStopMetadata {
  lat?: string | number
  latitude?: string | number
  location_type?: string | number
  locationType?: string | number
  lon?: string | number
  longitude?: string | number
  municipality_id?: string | number
  municipalityId?: string | number
  name?: string
  platform_code?: string | number
  platformCode?: string | number
  stop_id?: string | number
  stopId?: string | number
  vehicle_type?: string | number
  vehicleType?: string | number
  wheelchair_boarding?: string | number
  wheelchairBoarding?: string | number
  zone_id?: string | number
  zoneId?: string | number
}

type StopsResponse = BackendStop[] | {
  stops?: BackendStop[]
  data?: BackendStop[]
  fetchedAt?: number
}

type StopMetadataResponse = BackendStopMetadata & {
  fetchedAt?: number
  stop?: BackendStopMetadata
  data?: BackendStopMetadata
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

function toOptionalString(value: string | number | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return String(value)
}

function toOptionalNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getStopMetadataFromResponse(data: StopMetadataResponse): BackendStopMetadata {
  return data.stop ?? data.data ?? data
}

function toStopMetadata(stopId: string, stop: BackendStopMetadata): StopMetadata | null {
  const id = stop.stop_id ?? stop.stopId ?? stopId
  const name = stop.name

  if (!name) return null

  return {
    id: String(id),
    name,
    latitude: toOptionalNumber(stop.lat ?? stop.latitude),
    longitude: toOptionalNumber(stop.lon ?? stop.longitude),
    locationType: toOptionalString(stop.location_type ?? stop.locationType),
    municipalityId: toOptionalString(stop.municipality_id ?? stop.municipalityId),
    platformCode: toOptionalString(stop.platform_code ?? stop.platformCode),
    vehicleType: toOptionalString(stop.vehicle_type ?? stop.vehicleType),
    wheelchairBoarding: toOptionalString(stop.wheelchair_boarding ?? stop.wheelchairBoarding),
    zoneId: toOptionalString(stop.zone_id ?? stop.zoneId),
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

export async function fetchStop(stopId: string): Promise<StopMetadataResult> {
  const response = await fetch(`${STOPS_URL}/${encodeURIComponent(stopId)}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Stop metadata fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as StopMetadataResponse
  const stop = toStopMetadata(stopId, getStopMetadataFromResponse(data))

  if (!stop) {
    throw new Error(`Stop metadata response did not include a name for stop ${stopId}`)
  }

  return {
    stop,
    fetchedAt: data.fetchedAt ?? Date.now(),
  }
}
