import { Router } from 'express'
import { db } from './db.js'
import { tx, guard } from './songs.js'

export const presentationsRouter = Router()

const KINDS = ['song', 'bible', 'announcement', 'image', 'video', 'blank']
interface SlideIn { kind: string; source_id: number | null; content: string; style: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSlides(list: any): SlideIn[] | string {
  if (list === undefined) return []
  if (!Array.isArray(list)) return 'Slides must be a list.'
  const out: SlideIn[] = []
  for (const s of list) {
    if (!KINDS.includes(s?.kind)) return `Unknown slide type: ${s?.kind}`
    out.push({
      kind: s.kind,
      source_id: Number.isInteger(s.source_id) ? s.source_id : null,
      content: String(s.content ?? ''),
      style: JSON.stringify(s.style && typeof s.style === 'object' ? s.style : {}),
    })
  }
  return out
}

function writeSlides(pid: number, slides: SlideIn[]) {
  db.prepare('DELETE FROM presentation_slides WHERE presentation_id = ?').run(pid)
  const ins = db.prepare('INSERT INTO presentation_slides (presentation_id, kind, source_id, content, style_json, position) VALUES (?, ?, ?, ?, ?, ?)')
  slides.forEach((s, i) => ins.run(pid, s.kind, s.source_id, s.content, s.style, i))
}

function getPres(id: number) {
  const p = db.prepare('SELECT * FROM presentations WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!p) return null
  const rows = db.prepare('SELECT id, kind, source_id, content, style_json FROM presentation_slides WHERE presentation_id = ? ORDER BY position')
    .all(id) as unknown as { id: number; kind: string; source_id: number | null; content: string; style_json: string }[]
  return { ...p, slides: rows.map(r => ({ id: r.id, kind: r.kind, source_id: r.source_id, content: r.content, style: JSON.parse(r.style_json) })) }
}

const NOT_FOUND = { error: 'Presentation not found. It may have been deleted.' }

presentationsRouter.get('/', guard((_req, res) => {
  res.json(db.prepare(`SELECT p.id, p.name, p.updated_at,
    (SELECT COUNT(*) FROM presentation_slides WHERE presentation_id = p.id) AS slide_count
    FROM presentations p ORDER BY p.updated_at DESC, p.id DESC`).all())
}))

presentationsRouter.get('/:id', guard((req, res) => {
  const p = getPres(Number(req.params.id))
  return p ? res.json(p) : res.status(404).json(NOT_FOUND)
}))

presentationsRouter.post('/', guard((req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Presentation name is required.' })
  const slides = parseSlides(req.body?.slides)
  if (typeof slides === 'string') return res.status(400).json({ error: slides })
  const id = tx(() => {
    const pid = Number(db.prepare('INSERT INTO presentations (name) VALUES (?)').run(name).lastInsertRowid)
    writeSlides(pid, slides)
    return pid
  })
  res.status(201).json(getPres(id))
}))

presentationsRouter.put('/:id', guard((req, res) => {
  const id = Number(req.params.id)
  if (!getPres(id)) return res.status(404).json(NOT_FOUND)
  const name = String(req.body?.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Presentation name is required.' })
  const slides = parseSlides(req.body?.slides)
  if (typeof slides === 'string') return res.status(400).json({ error: slides })
  tx(() => {
    db.prepare(`UPDATE presentations SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(name, id)
    writeSlides(id, slides)
  })
  res.json(getPres(id))
}))

presentationsRouter.post('/:id/duplicate', guard((req, res) => {
  const src = getPres(Number(req.params.id)) as { name: string } | null
  if (!src) return res.status(404).json(NOT_FOUND)
  const newId = tx(() => {
    const pid = Number(db.prepare('INSERT INTO presentations (name) VALUES (?)').run(`${src.name} (copy)`).lastInsertRowid)
    db.prepare(`INSERT INTO presentation_slides (presentation_id, kind, source_id, content, style_json, position)
      SELECT ?, kind, source_id, content, style_json, position FROM presentation_slides WHERE presentation_id = ?`).run(pid, Number(req.params.id))
    return pid
  })
  res.status(201).json(getPres(newId))
}))

presentationsRouter.delete('/:id', guard((req, res) => {
  const r = db.prepare('DELETE FROM presentations WHERE id = ?').run(Number(req.params.id))
  return r.changes ? res.json({ ok: true }) : res.status(404).json(NOT_FOUND)
}))
