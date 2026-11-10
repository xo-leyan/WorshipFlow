import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Music, Megaphone, Square, Save, Trash2, AlignLeft, AlignCenter, AlignRight, Loader2, AlertTriangle, Search, X, Paintbrush, Radio } from 'lucide-react'
import { api } from '../api'
import SlideView from '../components/SlideView'
import { PRESETS } from '../backgrounds'
import { BASE_STYLE, FONTS, type Slide, type SlideStyle, type Song, type SongSummary } from '../types'

interface ApiSlide { kind: Slide['kind']; source_id: number | null; content: string; style: Partial<SlideStyle> }
const LINES_PER_SLIDE = 4

export default function PresentationEditor() {
  const { id } = useParams()
  const keyRef = useRef(1)
  const [name, setName] = useState('')
  const [slides, setSlides] = useState<Slide[]>([])
  const [sel, setSel] = useState(0)
  const [base, setBase] = useState<SlideStyle>(BASE_STYLE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [picker, setPicker] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api<{ name: string; slides: ApiSlide[] }>(`/presentations/${id}`),
      api<Record<string, string>>('/settings'),
    ]).then(([p, s]) => {
      const b: SlideStyle = {
        ...BASE_STYLE, fontFamily: s.default_font || BASE_STYLE.fontFamily, fontSize: Number(s.default_font_size) || 64,
        align: (s.default_text_align as SlideStyle['align']) || 'center', bgColor: s.default_background?.startsWith('#') ? s.default_background : BASE_STYLE.bgColor,
        bgImage: s.default_background && !s.default_background.startsWith('#') ? s.default_background : '',
      }
      setBase(b); setName(p.name)
      setSlides(p.slides.map(x => ({ ...x, key: keyRef.current++, style: { ...b, ...x.style } })))
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = (fn: (s: Slide[]) => Slide[]) => { setSlides(fn); setDirty(true); setNotice('') }
  const cur = slides[sel]
  const patchStyle = (p: Partial<SlideStyle>) => change(s => s.map((x, i) => (i === sel ? { ...x, style: { ...x.style, ...p } } : x)))

  function add(newSlides: Slide[]) {
    if (!newSlides.length) return
    const at = slides.length
    change(s => [...s, ...newSlides]); setSel(at)
  }
  const mk = (kind: Slide['kind'], content: string, source_id: number | null = null, label?: string): Slide =>
    ({ key: keyRef.current++, kind, source_id, content, style: { ...base, label } })

  async function addSong(songId: number) {
    try {
      const song = await api<Song>(`/songs/${songId}`)
      const out: Slide[] = []
      for (const sec of song.sections) {
        const lines = sec.content.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
        const chunks = Math.max(1, Math.ceil(lines.length / LINES_PER_SLIDE))
        for (let c = 0; c < chunks; c++) {
          const part = lines.slice(c * LINES_PER_SLIDE, (c + 1) * LINES_PER_SLIDE).join('\n')
          out.push(mk('song', part, song.id, `${song.title}: ${sec.label ?? sec.type}${chunks > 1 ? ` (${c + 1})` : ''}`))
        }
      }
      if (!out.length) { setError(`"${song.title}" has no lyrics yet. Add lyrics in the Songs page first.`); return }
      setError(''); add(out); setPicker(false)
    } catch (e) { setError((e as Error).message) }
  }

  function drop(to: number) {
    if (dragFrom === null || dragFrom === to) { setDragFrom(null); setDragOver(null); return }
    change(s => { const n = [...s]; const [m] = n.splice(dragFrom, 1); n.splice(to, 0, m); return n })
    setSel(to); setDragFrom(null); setDragOver(null)
  }

  function remove(i: number) {
    change(s => s.filter((_, j) => j !== i))
    setSel(s => Math.max(0, Math.min(s, slides.length - 2)))
  }

  async function save() {
    if (!name.trim()) { setError('Presentation name is required.'); return }
    setSaving(true); setError('')
    try {
      await api(`/presentations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, slides: slides.map(({ kind, source_id, content, style }) => ({ kind, source_id, content, style })) }),
      })
      setDirty(false); setNotice('Saved.')
    } catch (e) { setError((e as Error).message) }
    setSaving(false)
  }

  if (loading) return <div className="mt-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
  if (!name && error) return <p className="mx-auto mt-16 max-w-lg text-sm text-amber-300">{error} <Link className="text-accent-soft underline" to="/presentations">Back to presentations</Link></p>

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/presentations" className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Back"><ArrowLeft size={18} /></Link>
        <input className="input !w-auto min-w-[240px] flex-1 !text-base !font-semibold" value={name} onChange={e => { setName(e.target.value); setDirty(true) }} aria-label="Presentation name" />
        <span className="text-xs text-slate-500">{dirty ? 'Unsaved changes' : notice}</span>
        <button className="btn-ghost" onClick={() => setPicker(true)}><Music size={16} /> Add song</button>
        <button className="btn-ghost" onClick={() => add([mk('announcement', 'Announcement text')])}><Megaphone size={16} /> Announcement</button>
        <button className="btn-ghost" onClick={() => add([mk('blank', '')])}><Square size={16} /> Blank</button>
        <button className="btn-primary disabled:opacity-60" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save</button>
        <Link to={`/live/${id}`} className="btn-ghost"><Radio size={16} /> Go live</Link>
      </div>
      {error && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"><AlertTriangle size={16} /> {error}</p>}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
        <ol className="panel max-h-[70vh] space-y-2 overflow-y-auto p-3">
          {slides.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No slides yet. Add a song, announcement or blank slide.</li>}
          {slides.map((s, i) => (
            <li key={s.key} draggable onDragStart={() => setDragFrom(i)} onDragOver={e => { e.preventDefault(); setDragOver(i) }} onDrop={() => drop(i)} onDragEnd={() => { setDragFrom(null); setDragOver(null) }}
              className={`cursor-grab rounded-xl border p-1.5 ${i === sel ? 'border-accent-soft bg-accent/10' : 'border-transparent hover:bg-white/5'} ${dragOver === i && dragFrom !== null ? 'border-dashed border-accent-soft' : ''}`}>
              <button className="block w-full text-left" onClick={() => setSel(i)}>
                <SlideView content={s.content} style={s.style} className="rounded-lg" animate={false} />
                <p className="mt-1 truncate px-1 text-xs text-slate-400">{i + 1}. {s.style.label ?? s.kind}</p>
              </button>
            </li>
          ))}
        </ol>

        <div className="space-y-3">
          {cur ? <SlideView content={cur.content} style={cur.style} className="rounded-xl border border-white/10" /> :
            <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">Select or add a slide to preview it.</div>}
          {cur && <p className="text-xs text-slate-500">Slide {sel + 1} of {slides.length}. Drag slides in the list to reorder them.</p>}
        </div>

        <div className="panel max-h-[75vh] space-y-3 overflow-y-auto p-4 text-sm">
          {!cur ? <p className="text-slate-500">Slide settings appear here.</p> : (
            <>
              <label className="block">Text
                <textarea className="input mt-1 min-h-[110px] resize-y" value={cur.content} onChange={e => change(s => s.map((x, i) => (i === sel ? { ...x, content: e.target.value } : x)))} />
              </label>
              <label className="block">Font size: {cur.style.fontSize}
                <input type="range" min={24} max={160} value={cur.style.fontSize} onChange={e => patchStyle({ fontSize: Number(e.target.value) })} className="mt-1 w-full accent-violet-500" />
              </label>
              <label className="block">Font
                <select className="input mt-1" value={cur.style.fontFamily} onChange={e => patchStyle({ fontFamily: e.target.value })}>{FONTS.map(f => <option key={f}>{f}</option>)}</select>
              </label>
              <div className="flex gap-2">
                {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                  <button key={a} onClick={() => patchStyle({ align: a })} aria-label={`Align ${a}`} className={cur.style.align === a ? 'btn-primary !px-3' : 'btn-ghost !px-3'}><Icon size={16} /></button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>Text color<input type="color" className="mt-1 h-10 w-full rounded-lg bg-ink-900" value={cur.style.color} onChange={e => patchStyle({ color: e.target.value })} /></label>
                <label>Background<input type="color" className="mt-1 h-10 w-full rounded-lg bg-ink-900" value={cur.style.bgColor} onChange={e => patchStyle({ bgColor: e.target.value })} /></label>
              </div>
              <div>
                <p>Background</p>
                <div className="wf-still mt-1 grid grid-cols-3 gap-2">
                  <button onClick={() => patchStyle({ bgPreset: '', bgImage: '', bgVideo: '' })} title="Solid color"
                    className={`relative aspect-video overflow-hidden rounded-lg border text-[10px] text-slate-300 ${!cur.style.bgPreset && !cur.style.bgImage && !cur.style.bgVideo ? 'border-accent-soft' : 'border-white/10'}`}
                    style={{ background: cur.style.bgColor }}>Solid</button>
                  {PRESETS.map(b => (
                    <button key={b.id} title={b.name + (b.animated ? ' (animated)' : '')} onClick={() => patchStyle({ bgPreset: b.id, bgImage: '', bgVideo: '' })}
                      className={`relative aspect-video overflow-hidden rounded-lg border ${cur.style.bgPreset === b.id && !cur.style.bgImage && !cur.style.bgVideo ? 'border-accent-soft' : 'border-white/10'}`}>
                      <span className={`wfbg wfbg-${b.id}`} />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 text-[10px] text-slate-100">{b.name}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">Animated backgrounds move on the preview and audience screen only.</p>
              </div>
              <label className="block">Dim background: {cur.style.dim ?? 0}%
                <input type="range" min={0} max={70} value={cur.style.dim ?? 0} onChange={e => patchStyle({ dim: Number(e.target.value) })} className="mt-1 w-full accent-violet-500" />
              </label>
              <label className="block">Background image URL
                <input className="input mt-1" placeholder="https://... or /backgrounds/photo.jpg" value={cur.style.bgImage} onChange={e => patchStyle({ bgImage: e.target.value, bgVideo: '' })} />
              </label>
              <label className="block">Background video loop (mp4 or webm)
                <input className="input mt-1" placeholder="/backgrounds/loop.mp4" value={cur.style.bgVideo} onChange={e => patchStyle({ bgVideo: e.target.value })} />
              </label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-violet-500" checked={cur.style.shadow} onChange={e => patchStyle({ shadow: e.target.checked })} /> Text shadow</label>
              <div className="flex gap-2 pt-1">
                <button className="btn-ghost flex-1 justify-center" onClick={() => { const { label: _l, ...st } = cur.style; change(s => s.map(x => ({ ...x, style: { ...x.style, ...st } }))) }}><Paintbrush size={14} /> Style all</button>
                <button className="btn-ghost hover:!bg-red-500/10 hover:!text-red-400" onClick={() => remove(sel)} aria-label="Remove slide"><Trash2 size={14} /></button>
              </div>
            </>
          )}
        </div>
      </div>
      {picker && <SongPicker onClose={() => setPicker(false)} onPick={addSong} />}
    </div>
  )
}

function SongPicker({ onClose, onPick }: { onClose: () => void; onPick: (id: number) => void }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<SongSummary[] | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    const t = setTimeout(() => api<SongSummary[]>(`/songs?q=${encodeURIComponent(q)}`).then(setList).catch(e => setErr(e.message)), 150)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="panel flex max-h-[80vh] w-full max-w-lg flex-col p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Add a song</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5" aria-label="Close"><X size={18} /></button></div>
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input autoFocus className="input !pl-9" placeholder="Search by title or artist" value={q} onChange={e => setQ(e.target.value)} /></div>
        {err && <p className="text-sm text-amber-300">{err}</p>}
        <ul className="-mx-2 flex-1 divide-y divide-white/5 overflow-y-auto">
          {list?.length === 0 && <li className="p-4 text-center text-sm text-slate-500">No songs found.</li>}
          {list?.map(s => (
            <li key={s.id}><button className="w-full px-2 py-2.5 text-left hover:bg-white/5" onClick={() => onPick(s.id)}>
              <p className="text-sm text-slate-100">{s.title}</p><p className="text-xs text-slate-500">{s.artist || s.category}</p></button></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
