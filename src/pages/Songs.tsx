import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Star, Pencil, Trash2, Download, Upload, Loader2, AlertTriangle, Music } from 'lucide-react'
import { api } from '../api'
import type { SongSummary } from '../types'
import SongEditor from '../components/SongEditor'

export default function Songs() {
  const [songs, setSongs] = useState<SongSummary[] | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ q, category, ...(favOnly ? { favorite: '1' } : {}) })
      const [list, cats] = await Promise.all([api<SongSummary[]>(`/songs?${params}`), api<string[]>('/songs/categories')])
      setSongs(list); setCategories(cats); setError('')
    } catch (e) { setError((e as Error).message) }
  }, [q, category, favOnly])

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t) }, [load])

  async function toggleFav(id: number) {
    try { await api(`/songs/${id}/favorite`, { method: 'POST' }); load() } catch (e) { setError((e as Error).message) }
  }
  async function remove(s: SongSummary) {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return
    try { await api(`/songs/${s.id}`, { method: 'DELETE' }); setNotice(`Deleted "${s.title}".`); load() } catch (e) { setError((e as Error).message) }
  }
  async function exportAll() {
    try {
      const res = await fetch('/api/songs/export')
      if (!res.ok) throw new Error('Export failed.')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = 'worshipflow-songs.json'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
  }
  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text())
      const r = await api<{ added: number; skipped: number }>('/songs/import', { method: 'POST', body: JSON.stringify(data) })
      setNotice(`Imported ${r.added} song${r.added === 1 ? '' : 's'}${r.skipped ? `, skipped ${r.skipped} duplicate or invalid` : ''}.`)
      load()
    } catch (e) {
      setError(e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Songs</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import</button>
          <button className="btn-ghost" onClick={exportAll}><Download size={16} /> Export</button>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add song</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input !pl-9" placeholder="Search by title or artist" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className={favOnly ? 'btn-primary' : 'btn-ghost'} onClick={() => setFavOnly(f => !f)}><Star size={16} /> Favorites</button>
      </div>

      {notice && <p className="rounded-xl bg-accent/10 px-4 py-2.5 text-sm text-accent-soft">{notice}</p>}
      {error && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"><AlertTriangle size={16} /> {error}</p>}

      {songs === null && !error ? (
        <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : songs && songs.length === 0 ? (
        <div className="panel grid place-items-center gap-2 py-16 text-center">
          <Music className="text-slate-500" />
          <p className="text-sm text-slate-400">{q || category || favOnly ? 'No songs match your filters.' : 'Your library is empty. Add a song or import a library file.'}</p>
        </div>
      ) : (
        <ul className="panel divide-y divide-white/5">
          {songs?.map(s => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleFav(s.id)} aria-label={s.favorite ? 'Remove favorite' : 'Mark favorite'} className="text-slate-500 hover:text-amber-300">
                <Star size={18} className={s.favorite ? 'fill-amber-300 text-amber-300' : ''} />
              </button>
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(s.id)}>
                <p className="truncate font-medium text-slate-100">{s.title}</p>
                <p className="truncate text-xs text-slate-500">{[s.artist, s.category, s.language, `${s.section_count} sections`].filter(Boolean).join(', ')}</p>
              </button>
              <button onClick={() => setEditing(s.id)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Edit"><Pencil size={16} /></button>
              <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400" aria-label="Delete"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <SongEditor
          songId={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setNotice('Song saved.'); load() }}
        />
      )}
    </div>
  )
}
