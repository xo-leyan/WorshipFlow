import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, Trash2, Loader2, AlertTriangle, Presentation } from 'lucide-react'
import { api } from '../api'
import type { PresentationSummary } from '../types'

export default function Presentations() {
  const nav = useNavigate()
  const [list, setList] = useState<PresentationSummary[] | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')

  const load = () => api<PresentationSummary[]>('/presentations').then(l => { setList(l); setError('') }).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  async function create() {
    if (!name.trim()) { setError('Enter a name for the presentation.'); return }
    try {
      const p = await api<{ id: number }>('/presentations', { method: 'POST', body: JSON.stringify({ name }) })
      nav(`/presentations/${p.id}`)
    } catch (e) { setError((e as Error).message) }
  }
  async function dup(id: number) {
    try { await api(`/presentations/${id}/duplicate`, { method: 'POST' }); load() } catch (e) { setError((e as Error).message) }
  }
  async function remove(p: PresentationSummary) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try { await api(`/presentations/${p.id}`, { method: 'DELETE' }); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold text-white">Presentations</h1>
      <div className="flex gap-3">
        <input className="input" placeholder="New presentation name, for example Sunday service" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
        <button className="btn-primary shrink-0" onClick={create}><Plus size={16} /> Create</button>
      </div>
      {error && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"><AlertTriangle size={16} /> {error}</p>}
      {list === null && !error ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : list && list.length === 0 ? (
        <div className="panel grid place-items-center gap-2 py-16 text-center">
          <Presentation className="text-slate-500" />
          <p className="text-sm text-slate-400">No presentations yet. Name one above to get started.</p>
        </div>
      ) : (
        <ul className="panel divide-y divide-white/5">
          {list?.map(p => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => nav(`/presentations/${p.id}`)}>
                <p className="truncate font-medium text-slate-100">{p.name}</p>
                <p className="text-xs text-slate-500">{p.slide_count} slides, updated {p.updated_at}</p>
              </button>
              <button onClick={() => dup(p.id)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Duplicate"><Copy size={16} /></button>
              <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400" aria-label="Delete"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
