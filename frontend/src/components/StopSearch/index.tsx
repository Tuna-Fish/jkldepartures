// src/components/StopSearch/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
<<<<<<< HEAD

export interface StopResult {
  id: string
  name: string
  routes: string
}

// Placeholder data — replaced with real stops from GET /api/stops
// when the backend is connected in Step 4
const MOCK_STOPS: StopResult[] = [
  { id: '1111', name: 'Keskusta (M)',   routes: 'Routes 1, 4, 7, 12, 25' },
  { id: '2203', name: 'Mattilanniemi',  routes: 'Routes 12, 25' },
  { id: '3041', name: 'Yliopisto',      routes: 'Routes 7, 8, 9' },
  { id: '1084', name: 'Hämeenkatu',     routes: 'Routes 1, 3, 6' },
  { id: '4012', name: 'Keljonkangas',   routes: 'Routes 12, 15' },
  { id: '2110', name: 'Tourula',        routes: 'Routes 25, 26' },
  { id: '5001', name: 'Matkakeskus',    routes: 'Routes 1, 3, 4, 6, 7' },
  { id: '5102', name: 'Kuokkala',       routes: 'Routes 7, 8' },
  { id: '6201', name: 'Seppälä',        routes: 'Routes 25, 26' },
  { id: '6340', name: 'Tikkakoski',     routes: 'Routes 9' },
]
=======
import { useStops } from '../../hooks/useStops'
import type { Stop } from '../../api/types'
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="#2a3347" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

interface StopSearchProps {
  // When true, autofocuses the input — used on the dedicated search page
  autoFocus?: boolean
  // Override the placeholder text
  placeholder?: string
  // How many recent stops to show before the user types
  recentCount?: number
}

export default function StopSearch({
  autoFocus = false,
  placeholder = 'Search stop name or number…',
  recentCount = 4,
}: StopSearchProps) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data, isLoading, isError } = useStops()

<<<<<<< HEAD
  const isSearching = query.trim().length > 0

  const filtered = isSearching
    ? MOCK_STOPS.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.id.includes(query.trim())
      )
    : MOCK_STOPS.slice(0, recentCount)

  const handleSelect = (stop: StopResult) => {
=======
  const stops = data?.stops ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery.length > 0
    ? stops.filter(s =>
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.id.includes(normalizedQuery)
      )
    : stops.slice(0, 4)

  const handleSelect = (stop: Stop) => {
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
    navigate(`/stop/${stop.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="
            w-full bg-surface-raised border border-surface-border rounded-xl
            pl-10 pr-10 py-3 text-[15px] text-slate-100 placeholder-slate-500
            outline-none focus:border-accent font-sans transition-colors duration-150
          "
        />
        {/* Clear button — only shown when typing */}
        {isSearching && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2
              text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Section label */}
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
        {isSearching
          ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
          : 'Recent stops'}
      </p>

      {/* Stop list */}
      <div className="flex flex-col gap-2">
<<<<<<< HEAD
        {filtered.length === 0 ? (
          <div className="bg-surface-raised border border-surface-border
            rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#64748b" strokeWidth={1.5}
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-[14px] font-semibold text-slate-400">
              No stops found
            </p>
            <p className="text-[12px] text-slate-500">
              Try a different name or stop number
            </p>
          </div>
=======
        {isLoading ? (
          <p className="text-[13px] text-slate-500 py-4 text-center">
            Loading stops…
          </p>
        ) : isError ? (
          <p className="text-[13px] text-rose-300 py-4 text-center">
            Stops could not be loaded.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-slate-500 py-4 text-center">
            No stops found for "{query}"
          </p>
>>>>>>> f3cdb8957380b8e9565d0c9307d4486b8468899a
        ) : (
          filtered.map(stop => (
            <button
              key={stop.id}
              onClick={() => handleSelect(stop)}
              className="
                w-full bg-surface-raised border border-surface-border rounded-xl
                px-3.5 py-3 flex items-center gap-3
                hover:border-accent/40 active:scale-[0.99]
                transition-all duration-150 text-left
              "
            >
              <span className="
                bg-surface-overlay rounded-lg px-2 py-1
                text-[12px] font-bold font-display text-slate-400 flex-shrink-0
              ">
                {stop.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-slate-100 truncate">
                  {stop.name}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                  Stop {stop.id}
                </p>
              </div>
              <ChevronIcon />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
