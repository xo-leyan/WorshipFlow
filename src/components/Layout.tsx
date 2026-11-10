import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Music, Presentation, Radio, BookOpen, Image, CalendarDays, Settings, Flame } from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/songs', label: 'Songs', icon: Music },
  { to: '/presentations', label: 'Presentations', icon: Presentation },
  { to: '/live', label: 'Go live', icon: Radio },
  { to: '/bible', label: 'Bible', icon: BookOpen },
  { to: '/media', label: 'Media', icon: Image },
  { to: '/schedules', label: 'Services', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/5 bg-charcoal p-3 md:w-60 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-4">
        <div className="hidden items-center gap-2 px-2 pb-5 pt-1 md:flex">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><Flame size={20} /></span>
          <span className="text-lg font-semibold tracking-tight text-white">WorshipFlow</span>
        </div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-accent/15 text-accent-soft' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
