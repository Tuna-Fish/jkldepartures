// src/components/AlertBanner/index.tsx

export type AlertLevel = 'info' | 'warning' | 'severe'

interface AlertBannerProps {
  level: AlertLevel
  title: string
  description: string
}

const styles: Record<AlertLevel, { wrap: string; title: string; desc: string; iconColor: string }> = {
  info:    { wrap: 'bg-[#0c1f3a] border border-[#1e3a5f]', title: 'text-[#93c5fd]', desc: 'text-[#60a5fa]',  iconColor: '#93c5fd' },
  warning: { wrap: 'bg-[#2d1f0a] border border-[#78350f]', title: 'text-[#fcd34d]', desc: 'text-[#fbbf24]',  iconColor: '#fbbf24' },
  severe:  { wrap: 'bg-[#3b1a1a] border border-[#7f1d1d]', title: 'text-[#fca5a5]', desc: 'text-[#f87171]',  iconColor: '#f87171' },
}

const WarningIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className="flex-shrink-0 mt-0.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export default function AlertBanner({ level, title, description }: AlertBannerProps) {
  const s = styles[level]
  return (
    <div className={`rounded-[10px] px-3.5 py-3 flex gap-2.5 items-start ${s.wrap}`}>
      <WarningIcon color={s.iconColor} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold ${s.title}`}>{title}</p>
        <p className={`text-[12px] mt-0.5 ${s.desc}`}>{description}</p>
      </div>
    </div>
  )
}