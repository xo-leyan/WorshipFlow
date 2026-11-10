import { useEffect, useRef, useState } from 'react'
import { X, Plus, ArrowUp, ArrowDown, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import { SECTION_TYPES, DEFAULT_CATEGORIES, type Song, type SectionType } from '../types'

interface Row { key: number; type: SectionType; content: string }
interface Props { songId: number | null; categories: string[]; onClose: () => void; onSaved: () => void }

export default function SongEditor({ songId, categories, onClose, onSaved }: Props) {
  const nextKey = useRef(1)
  const mk = (type: SectionType, content = ''): Row => ({ key: nextKey.current++, type, content })
  const [loading, setLoading] = useState(songId !== null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('English')
  const [favorite, setFavorite] = useState(false)
  const [rows, setRows] = useState<Row[]>(() => [mk('verse'), mk('chorus')])

  useEffect(() => {
    if (songId === null) return
    api<Song>(`/songs/${songId}`)
      .then(s => {
        setTitle(s.title); setArtist(s.artist); setCategory(s.category === 'Uncategorized' ? '' : s.category)
        setLanguage(s.language); setFavorite(!!s.favorite)
        setRows(s.sections.map(x => mk(x.type, x.content)))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  const move = (i: number, d: -1 | 1) =>
    setRows(r => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n })
  const patch = (key: number, p: Partial<Row>) => setRows(r => r.map(x => (x.key === key ? { ...x, ...p } : x)))

  const labelAt = (i: number) => {
    const t = rows[i].type
    if (t !== 'verse') return SECTION_TYPES.find(s => s.value === t)!.label
    return `Verse ${rows.slice(0, i + 1).filter(x => x.type === 'verse').length}`
  }

  async function save() {
    if (!title.trim()) { setError('Song title is required.'); return }
    setSaving(true); setError('')
    try {
      const body = JSON.stringify({
        title, artist, category, language, favorite,
        sections: rows.filter(r => r.content.trim()).map(r => ({ type: r.type, content: r.content })),
      })
      await api(songId === null ? '/songs' : `/songs/${songId}`, { method: songId === null ? 'POST' : 'PUT', body })
      onSaved()
    } catch (e) { setError((e as Error).message); setSaving(false) }
  }

  const cats = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories.filter(c => c !== 'Uncategorized')]))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="panel w-full max-w-3xl bg-ink-800 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{songId === null ? 'Add song' : 'Edit song'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5" aria-label="Close"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">Song title
                <input className="input mt-1" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              </label>
              <label className="text-sm">Artist / composer
                <input className="input mt-1" value={artist} onChange={e => setArtist(e.target.value)} />
              </label>
              <label className="text-sm">Category
                <input className="input mt-1" list="cats" value={category} placeholder="Uncategorized" onChange={e => setCategory(e.target.value)} />
                <datalist id="cats">{cats.map(c => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="text-sm">Language
                <select className="input mt-1" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option>English</option><option>Filipino</option><option>Bilingual</option>
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
                <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="accent-violet-500" /> Favorite
              </label>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Lyrics, in the order they are sung</h3>
              {rows.length === 0 && <p className="text-sm text-slate-500">No sections yet. Add a verse or chorus below.</p>}
              {rows.map((r, i) => (
                <div key={r.key} className="rounded-xl border border-white/5 bg-ink-900 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <select className="input !w-auto" value={r.type} onChange={e => patch(r.key, { type: e.target.value as SectionType })} aria-label="Section type">
                      {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <span className="text-sm text-slate-400">{labelAt(i)}</span>
                    <span className="ml-auto flex gap-1">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30" aria-label="Move up"><ArrowUp size={16} /></button>
                      <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30" aria-label="Move down"><ArrowDown size={16} /></button>
                      <button onClick={() => setRows(x => x.filter(y => y.key !== r.key))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400" aria-label="Remove section"><Trash2 size={16} /></button>
                    </span>
                  </div>
                  <textarea className="input min-h-[96px] resize-y" value={r.content} onChange={e => patch(r.key, { content: e.target.value })} placeholder="One lyric line per row" />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {SECTION_TYPES.map(t => (
                  <button key={t.value} onClick={() => setRows(r => [...r, mk(t.value)])} className="btn-ghost !px-3 !py-1.5"><Plus size={14} /> {t.label}</button>
                ))}
              </div>
            </div>

            {error && <p className="flex items-center gap-2 text-sm text-amber-400"><AlertTriangle size={16} /> {error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving && <Loader2 size={16} className="animate-spin" />} Save song
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
