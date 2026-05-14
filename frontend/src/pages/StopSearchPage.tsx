// src/pages/StopSearchPage.tsx
import { useNavigate } from 'react-router-dom'
import StopSearch from '../components/StopSearch'

export default function StopSearchPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-raised border-b border-surface-border
        px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-surface-overlay border border-surface-border
            flex items-center justify-center flex-shrink-0
            hover:border-accent/50 transition-colors"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#94a3b8" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className="flex-1 text-[15px] font-semibold text-slate-100">
          Find a stop
        </p>
      </div>

      {/* Search content */}
      <div className="flex flex-col gap-0 px-4 pt-4 pb-6">
        <StopSearch
          autoFocus={true}
          placeholder="Stop name or number…"
          recentCount={6}
        />
      </div>
    </div>
  )
}