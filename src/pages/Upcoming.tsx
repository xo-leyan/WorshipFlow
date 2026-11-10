import { Hammer } from 'lucide-react'

export default function Upcoming({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink-700 text-accent-soft"><Hammer size={22} /></span>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">This module is built in Phase {phase}. The database tables it needs already exist.</p>
    </div>
  )
}
