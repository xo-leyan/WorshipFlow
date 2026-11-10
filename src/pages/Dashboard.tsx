import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Music, BookOpen, Presentation, CalendarDays, Plus, Radio, Image, FilePlus2, AlertTriangle, Loader2 } from 'lucide-react'
import { api } from '../api'

interface DashboardData {
  totals: { songs: number; verses: number; presentations: number; schedules: number; media: number }
  recentSongs: { id: number; title: string; artist: string; category: string }[]
  recentSchedules: { id: number; title: string; service_date: string }[]
}

const quick = [
  { to: '/presentations', label: 'Create new presentation', icon: FilePlus2 },
  { to: '/songs', label: 'Add new song', icon: Plus },
  { to: '/bible', label: 'Open Bible', icon: BookOpen },
  { to: '/live', label: 'Start live presentation', icon: Radio },
  { to: '/media', label: 'Manage media', icon: Image },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<DashboardData>('/dashboard').then(setData).catch(e => setError(e.message))
  }, [])

  if (error)
    return (
      <div className="panel mx-auto mt-16 flex max-w-lg items-start gap-3 p-5 text-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={18} />
        <p>{error}</p>
      </div>
    )
  if (!data)
    return <div className="mt-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>

  const stats = [
    { label: 'Songs', value: data.totals.songs, icon: Music },
    { label: 'Bible verses', value: data.totals.verses, icon: BookOpen },
    { label: 'Saved presentations', value: data.totals.presentations, icon: Presentation },
    { label: 'Service schedules', value: data.totals.schedules, icon: CalendarDays },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panel flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-soft"><Icon size={20} /></span>
            <div>
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-400">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          {quick.map(({ to, label, icon: Icon }, i) => (
            <Link key={to} to={to} className={i === 3 ? 'btn-primary' : 'btn-ghost'}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-3 font-medium text-white">Recently added songs</h2>
          {data.recentSongs.length === 0 ? (
            <p className="text-sm text-slate-400">No songs yet. <Link to="/songs" className="text-accent-soft hover:underline">Add your first song</Link>.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.recentSongs.map(s => (
                <li key={s.id} className="flex items-baseline justify-between py-2.5 text-sm">
                  <span className="text-slate-100">{s.title}</span>
                  <span className="text-slate-500">{s.artist || s.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="mb-3 font-medium text-white">Recent worship schedules</h2>
          {data.recentSchedules.length === 0 ? (
            <p className="text-sm text-slate-400">No services planned yet. <Link to="/schedules" className="text-accent-soft hover:underline">Plan a service</Link>.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.recentSchedules.map(s => (
                <li key={s.id} className="flex items-baseline justify-between py-2.5 text-sm">
                  <span className="text-slate-100">{s.title}</span>
                  <span className="text-slate-500">{s.service_date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
