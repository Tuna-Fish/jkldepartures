// src/components/StopSearch/index.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStops } from '../../hooks/useStops'
import type { Stop } from '../../api/types'

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="#2a3347" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function StopSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data, isLoading, isError } = useStops()

  const stops = data?.stops ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery.length > 0
    ? stops.filter(s =>
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.id.includes(normalizedQuery)
      )
    : stops.slice(0, 4)

  const handleSelect = (stop: Stop) => {
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
          placeholder="Search stop name or number…"
          className="
            w-full bg-surface-raised border border-surface-border rounded-xl
            pl-10 pr-4 py-3 text-[15px] text-slate-100 placeholder-slate-500
            outline-none focus:border-accent font-sans transition-colors duration-150
          "
        />
      </div>

      {/* Section label */}
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
        {query.trim().length > 0 ? 'Results' : 'Recent stops'}
      </p>

      {/* Stop list */}
      <div className="flex flex-col gap-2">
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
        ) : (
          filtered.map(stop => (
            <button
              key={stop.id}
              onClick={() => handleSelect(stop)}
              className="
                w-full bg-surface-raised border border-surface-border rounded-xl
                px-3.5 py-3 flex items-center gap-3
                hover:border-accent transition-colors duration-150 text-left
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
