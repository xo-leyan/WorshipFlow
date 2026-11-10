import type { SlideStyle } from './types'

export interface LiveSlide { content: string; style: SlideStyle }
export interface StateMsg { type: 'state'; live: boolean; mode: 'normal' | 'black' | 'clear'; slide: LiveSlide | null }
export type LiveMsg = StateMsg | { type: 'hello' } | { type: 'ping' } | { type: 'pong' }

const NAME = 'worshipflow-live'
const MSG_KEY = 'wf-live-msg'
export const LAST_KEY = 'wf-live-last'

// BroadcastChannel is the main transport. If a browser lacks it, localStorage events carry the same messages.
export function openChannel(onMsg: (m: LiveMsg) => void) {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(NAME) : null
  const onStorage = (e: StorageEvent) => {
    if (e.key !== MSG_KEY || !e.newValue) return
    try { onMsg(JSON.parse(e.newValue).m as LiveMsg) } catch { /* ignore malformed */ }
  }
  if (bc) bc.onmessage = e => onMsg(e.data as LiveMsg)
  else window.addEventListener('storage', onStorage)
  return {
    send(m: LiveMsg) {
      if (bc) bc.postMessage(m)
      else { try { localStorage.setItem(MSG_KEY, JSON.stringify({ m, t: Date.now() })) } catch { /* storage unavailable */ } }
    },
    close() { bc?.close(); window.removeEventListener('storage', onStorage) },
  }
}

export function saveLast(m: StateMsg) { try { localStorage.setItem(LAST_KEY, JSON.stringify(m)) } catch { /* ignore */ } }
export function readLast(): StateMsg | null {
  try { const v = localStorage.getItem(LAST_KEY); return v ? (JSON.parse(v) as StateMsg) : null } catch { return null }
}
