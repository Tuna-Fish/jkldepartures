// src/pages/HomePage.tsx
import AlertBanner from '../components/AlertBanner'
import StopSearch from '../components/StopSearch'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      {/* Hero */}
      <div className="pt-8 pb-2 flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-100">
          Good morning
        </h1>
        <p className="text-[13px] text-slate-500">
          Jyväskylä public transport
        </p>
      </div>

      {/* Search + recent stops */}
      <StopSearch />

      {/* Active service alert */}
      <AlertBanner
        level="warning"
        title="Route 4 — delays expected"
        description="Road works on Kauppakatu until 18:00"
      />
    </div>
  )
}