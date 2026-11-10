import { useEffect, useRef, useState } from 'react'
import SlideView from '../components/SlideView'
import { openChannel, readLast, type LiveSlide, type StateMsg } from '../liveChannel'
import type { SlideStyle } from '../types'

interface Layer { id: number; slide: LiveSlide | null }
const bgKey = (s: SlideStyle) => [s.bgPreset, s.bgImage, s.bgVideo, s.bgColor, s.dim].join('|')

export default function Display() {
  const [state, setState] = useState<StateMsg | null>(readLast)
  const [layers, setLayers] = useState<Layer[]>([])
  const [idle, setIdle] = useState(false)
  const [full, setFull] = useState(!!document.fullscreenElement)
  const idRef = useRef(0)

  useEffect(() => {
    document.title = 'WorshipFlow audience display'
    const ch = openChannel(m => {
      if (m.type === 'state') setState(m)
      else if (m.type === 'ping') ch.send({ type: 'pong' })
    })
    ch.send({ type: 'hello' })
    return () => ch.close()
  }, [])

  const target = state && state.live && state.mode !== 'black' ? state.slide : null
  const key = JSON.stringify(target)
  useEffect(() => {
    setLayers(prev => {
      const top = prev[prev.length - 1]
      if (!target && !top?.slide) return prev
      if (target && top?.slide && bgKey(top.slide.style) === bgKey(target.style)) return [...prev.slice(0, -1), { ...top, slide: target }]
      return [...prev.slice(-1), { id: ++idRef.current, slide: target }]
    })
    const t = setTimeout(() => setLayers(p => (p.length > 1 ? p.slice(-1) : p)), 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }
  useEffect(() => {
    let timer: number
    const wake = () => { setIdle(false); clearTimeout(timer); timer = window.setTimeout(() => setIdle(true), 3000) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'f' || e.key === 'F') toggleFull() }
    const onFs = () => setFull(!!document.fullscreenElement)
    wake()
    window.addEventListener('mousemove', wake); window.addEventListener('keydown', onKey); document.addEventListener('fullscreenchange', onFs)
    return () => {
      clearTimeout(timer); window.removeEventListener('mousemove', wake); window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-black" style={{ cursor: idle ? 'none' : 'default' }} onDoubleClick={toggleFull}>
      <div className="relative" style={{ width: 'min(100vw, calc(100vh * 16 / 9))', aspectRatio: '16 / 9' }}>
        {layers.map((l, i) => (
          <div key={l.id} className={`absolute inset-0 ${i === layers.length - 1 ? 'wf-fadein' : 'wf-fadeout'}`}>
            {l.slide && <SlideView content={l.slide.content} style={l.slide.style} fadeText />}
          </div>
        ))}
      </div>
      {!idle && !full && (
        <p className="absolute bottom-6 rounded-xl bg-black/70 px-4 py-2 text-sm text-slate-300">
          {state ? 'Double-click or press F for full screen.' : 'Waiting for the control screen to start.'}
        </p>
      )}
    </div>
  )
}
