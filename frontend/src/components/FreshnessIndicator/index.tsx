// src/components/FreshnessIndicator/index.tsx

interface FreshnessIndicatorProps {
  fetchedAt: number | null   // Date.now() ms, null = never fetched
  staleAfterMs?: number      // default 45s
}

export default function FreshnessIndicator({
  fetchedAt,
  staleAfterMs = 45_000,
}: FreshnessIndicatorProps) {
  if (!fetchedAt) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
        <span className="text-[11px] text-slate-500">Waiting…</span>
      </div>
    )
  }

  const ageMs = Date.now() - fetchedAt
  const isStale = ageMs > staleAfterMs
  const ageSeconds = Math.floor(ageMs / 1000)

  const label = ageSeconds < 5
    ? 'Live'
    : ageSeconds < 60
    ? `${ageSeconds}s ago`
    : `${Math.floor(ageSeconds / 60)}m ago`

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isStale ? 'bg-status-delayed' : 'bg-status-ontime'
        }`}
      />
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
  )
}