// src/layouts/AppLayout.tsx
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'departures',
    path: '/stop/search',
    label: 'Departures',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: 'map',
    path: '/map',
    label: 'Map',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    id: 'alerts',
    path: '/alerts',
    label: 'Alerts',
    badge: 2,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-base">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom nav — fixed above content */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-surface-border flex z-50">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 pb-2.5
                text-[10px] font-medium transition-colors duration-150
                ${active ? 'text-accent' : 'text-slate-500'}
              `}
            >
              <div className="w-5 h-5 relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 bg-accent text-white
                    text-[9px] font-bold font-display px-1 rounded-full leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}