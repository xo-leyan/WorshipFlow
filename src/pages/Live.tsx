import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Square, MonitorPlay, EyeOff, Eraser, Loader2, AlertTriangle, Radio } from 'lucide-react'
import { api } from '../api'
import SlideView from '../components/SlideView'
import { PRESETS } from '../backgrounds'
import { openChannel, saveLast, type StateMsg } from '../liveChannel'
import { BASE_STYLE, type Slide, type SlideStyle, type PresentationSummary } from '../types'

export default function Live() {
  const { id } = useParams()
  return id ? <LiveControl id={id} /> : <LivePicker />
}

function LivePicker() {
  const nav = useNavigate()
  const [list, setList] = useState<PresentationSummary[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<PresentationSummary[]>('/presentations').then(setList).catch(e => setError(e.message)) }, [])
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold text-white">Go live</h1>
      <p className="text-sm text-slate-400">Choose a presentation to control.</p>
      {error && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"><AlertTriangle size={16} /> {error}</p>}
      {list === null && !error ? <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
        : list?.length === 0 ? <p className="panel p-8 text-center text-sm text-slate-400">No presentations yet. <Link className="text-accent-soft underline" to="/presentations">Create one</Link> first.</p>
        : <ul className="panel divide-y divide-white/5">{list?.map(p => (
          <li key={p.id}><button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5" onClick={() => nav(`/live/${p.id}`)}>
            <span className="text-slate-100">{p.name}</span><span className="text-xs text-slate-500">{p.slide_count} slides</span></button></li>))}</ul>}
    </div>
  )
}

interface BgOverride { bgPreset: string; bgImage: string; bgVideo: string }

function LiveControl({ id }: { id: string }) {
  const [name, setName] = useState('')
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [idx, setIdx] = useState(0)
  const [live, setLive] = useState(false)
  const [mode, setMode] = useState<'normal' | 'black' | 'clear'>('normal')
  const [scale, setScale] = useState(100)
  const [bg, setBg] = useState<BgOverride | null>(null)
  const [connected, setConnected] = useState(false)
  const chRef = useRef<ReturnType<typeof openChannel> | null>(null)
  const winRef = useRef<Window | null>(null)
  const lastPong = useRef(0)
  const stateRef = useRef<StateMsg>({ type: 'state', live: false, mode: 'normal', slide: null })

  useEffect(() => {
    api<{ name: string; slides: Omit<Slide, 'key'>[] }>(`/presentations/${id}`)
      .then(p => { setName(p.name); setSlides(p.slides.map((s, i) => ({ ...s, key: i, style: { ...BASE_STYLE, ...s.style } }))) })
      .catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id])

  const cur = slides[idx]
  const eff = useMemo(() => {
    if (!cur) return null
    const style: SlideStyle = { ...cur.style, ...(bg ?? {}), fontSize: Math.round(cur.style.fontSize * scale / 100) }
    return { content: mode === 'clear' ? '' : cur.content, style }
  }, [cur, bg, scale, mode])

  // Publish the state to the audience window whenever it changes.
  useEffect(() => {
    const m: StateMsg = { type: 'state', live, mode, slide: eff }
    stateRef.current = m
    chRef.current?.send(m)
    saveLast(m)
  }, [live, mode, eff])

  useEffect(() => {
    const ch = openChannel(m => {
      if (m.type === 'hello') ch.send(stateRef.current)
      else if (m.type === 'pong') lastPong.current = Date.now()
    })
    chRef.current = ch
    const t = setInterval(() => {
      ch.send({ type: 'ping' })
      setConnected(!!winRef.current && !winRef.current.closed ? Date.now() - lastPong.current < 4500 : Date.now() - lastPong.current < 4500)
    }, 1500)
    ch.send(stateRef.current)
    return () => { clearInterval(t); ch.close() }
  }, [])

  const go = useCallback((n: number | ((i: number) => number)) => {
    setIdx(i => Math.max(0, Math.min(slides.length - 1, typeof n === 'function' ? n(i) : n)))
    setMode('normal')
  }, [slides.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') go(i => i + 1)
      else if (k === 'ArrowLeft' || k === 'PageUp') go(i => i - 1)
      else if (k === 'Home') go(0)
      else if (k === 'End') go(slides.length - 1)
      else if (k === 'b' || k === 'B') setMode(m => (m === 'black' ? 'normal' : 'black'))
      else if (k === 'c' || k === 'C') setMode(m => (m === 'clear' ? 'normal' : 'clear'))
      else if (k === 'Escape') { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); return }
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, slides.length])

  useEffect(() => { document.getElementById(`thumb-${idx}`)?.scrollIntoView({ block: 'nearest' }) }, [idx])

  function openDisplay() {
    const w = window.open('/display', 'wf-display', 'popup=yes,width=1280,height=720')
    if (!w) { setError('The browser blocked the audience window. Allow pop-ups for this site, then try again.'); return }
    setError(''); winRef.current = w; w.focus()
  }

  const songs = useMemo(() => {
    const out: { title: string; at: number }[] = []
    slides.forEach((s, i) => {
      if (s.kind !== 'song') return
      if (i > 0 && slides[i - 1].kind === 'song' && slides[i - 1].source_id === s.source_id) return
      out.push({ title: (s.style.label ?? 'Song').split(':')[0], at: i })
    })
    return out
  }, [slides])

  if (loading) return <div className="mt-24 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
  if (error && !slides.length && !name) return <p className="mx-auto mt-16 max-w-lg text-sm text-amber-300">{error} <Link className="underline" to="/live">Back</Link></p>

  const next = slides[idx + 1]
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/live" className="rounded-lg p-2 text-slate-400 hover:bg-white/5" aria-label="Back"><ArrowLeft size={18} /></Link>
        <h1 className="mr-auto truncate text-lg font-semibold text-white">{name}</h1>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
          <span className="h-2 w-2 rounded-full bg-current" /> {connected ? 'Audience display connected' : 'Audience display not connected'}
        </span>
        <button className="btn-ghost" onClick={openDisplay}><MonitorPlay size={16} /> {connected ? 'Reopen display' : 'Open display'}</button>
        {live ? <button className="btn-primary !bg-red-600 hover:!bg-red-700" onClick={() => setLive(false)}><Square size={16} /> Stop</button>
          : <button className="btn-primary" onClick={() => setLive(true)} disabled={!slides.length}><Play size={16} /> Start</button>}
      </div>
      {error && <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"><AlertTriangle size={16} /> {error}</p>}
      {!connected && <p className="text-xs text-slate-500">Open the display, drag that window to the projector, then double-click it for full screen. If it disconnects, click Reopen display; it picks up the current slide automatically.</p>}

      {slides.length === 0 ? <p className="panel p-10 text-center text-sm text-slate-400">This presentation has no slides. <Link className="text-accent-soft underline" to={`/presentations/${id}`}>Add some in the editor</Link>.</p> : (
        <div className="grid gap-4 lg:grid-cols-[230px_1fr_280px]">
          <ol className="panel max-h-[75vh] space-y-2 overflow-y-auto p-3">
            {slides.map((s, i) => (
              <li key={s.key} id={`thumb-${i}`}>
                <button onClick={() => go(i)} className={`block w-full rounded-xl border p-1.5 text-left ${i === idx ? 'border-accent-soft bg-accent/10' : 'border-transparent hover:bg-white/5'}`}>
                  <SlideView content={s.content} style={s.style} className="rounded-lg" animate={false} />
                  <p className="mt-1 truncate px-1 text-xs text-slate-400">{i + 1}. {s.style.label ?? s.kind}</p>
                </button>
              </li>
            ))}
          </ol>

          <div className="space-y-4">
            <div>
              <p className="mb-1 flex items-center gap-2 text-sm text-slate-400">
                Now showing {live ? <span className="flex items-center gap-1 text-red-400"><Radio size={14} /> Live</span> : <span className="text-slate-500">(not live, press Start)</span>}
              </p>
              <div className="relative">
                {eff && <SlideView content={eff.content} style={eff.style} className="rounded-xl border border-white/10" />}
                {mode === 'black' && <div className="absolute inset-0 grid place-items-center rounded-xl bg-black text-sm text-slate-400">Black screen</div>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-ghost" onClick={() => go(i => i - 1)} disabled={idx === 0}><ChevronLeft size={18} /> Previous</button>
              <button className="btn-primary" onClick={() => go(i => i + 1)} disabled={idx >= slides.length - 1}>Next <ChevronRight size={18} /></button>
              <button className={mode === 'black' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode(m => (m === 'black' ? 'normal' : 'black'))}><EyeOff size={16} /> Black (B)</button>
              <button className={mode === 'clear' ? 'btn-primary' : 'btn-ghost'} onClick={() => setMode(m => (m === 'clear' ? 'normal' : 'clear'))}><Eraser size={16} /> Clear (C)</button>
              <span className="ml-auto text-sm text-slate-500">{idx + 1} / {slides.length}</span>
            </div>
            <div className="w-1/2 min-w-[220px]">
              <p className="mb-1 text-sm text-slate-400">Next slide</p>
              {next ? <SlideView content={next.content} style={{ ...next.style, ...(bg ?? {}) }} className="rounded-lg border border-white/10" animate={false} />
                : <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-white/10 text-xs text-slate-500">End of presentation</div>}
            </div>
          </div>

          <div className="panel max-h-[75vh] space-y-4 overflow-y-auto p-4 text-sm">
            <label className="block">Text size: {scale}%
              <input type="range" min={50} max={200} step={5} value={scale} onChange={e => setScale(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
            </label>
            <div>
              <p>Background for all slides</p>
              <div className="wf-still mt-1 grid grid-cols-3 gap-2">
                <button onClick={() => setBg(null)} className={`rounded-lg border p-2 text-[11px] ${bg === null ? 'border-accent-soft text-white' : 'border-white/10 text-slate-400'}`}>Slide's own</button>
                {PRESETS.map(b => (
                  <button key={b.id} title={b.name} onClick={() => setBg({ bgPreset: b.id, bgImage: '', bgVideo: '' })}
                    className={`relative aspect-video overflow-hidden rounded-lg border ${bg?.bgPreset === b.id ? 'border-accent-soft' : 'border-white/10'}`}>
                    <span className={`wfbg wfbg-${b.id}`} /><span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 text-[10px] text-slate-100">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1">Jump to song</p>
              {songs.length === 0 ? <p className="text-xs text-slate-500">No songs in this presentation.</p> : (
                <ul className="space-y-1">{songs.map(s => (
                  <li key={s.at}><button onClick={() => go(s.at)} className="w-full truncate rounded-lg bg-ink-700 px-3 py-2 text-left hover:bg-ink-600">{s.title}</button></li>))}</ul>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-500">Keys: Right or Space next, Left previous, B black, C clear, Home first, End last, Esc leaves full screen.</p>
          </div>
        </div>
      )}
    </div>
  )
}
