import { Router, type Request, type Response } from 'express'
import { db } from './db.js'

export const songsRouter = Router()

const LANGS = ['English', 'Filipino', 'Bilingual']
const TYPES = ['verse', 'chorus', 'pre-chorus', 'bridge', 'ending', 'intro', 'tag']
const NAMES: Record<string, string> = {
  verse: 'Verse', chorus: 'Chorus', 'pre-chorus': 'Pre-chorus', bridge: 'Bridge', ending: 'Ending', intro: 'Intro', tag: 'Tag',
}

interface SongIn {
  title: string; artist: string; category: string; language: string; favorite: number
  sections: { type: string; content: string }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(b: any): SongIn | string {
  if (!b || typeof b !== 'object') return 'Send a song as JSON.'
  const title = String(b.title ?? '').trim()
  if (!title) return 'Song title is required.'
  const language = LANGS.includes(b.language) ? b.language : 'English'
  const sections = Array.isArray(b.sections) ? b.sections : []
  for (const s of sections) if (!TYPES.includes(s?.type)) return `Unknown section type: ${s?.type}`
  return {
    title,
    artist: String(b.artist ?? '').trim(),
    category: String(b.category ?? '').trim() || 'Uncategorized',
    language,
    favorite: b.favorite ? 1 : 0,
    sections: sections.map((s: { type: string; content?: unknown }) => ({ type: s.type, content: String(s.content ?? '') })),
  }
}

function writeSections(songId: number, sections: SongIn['sections']) {
  db.prepare('DELETE FROM song_sections WHERE song_id = ?').run(songId)
  const ins = db.prepare('INSERT INTO song_sections (song_id, type, label, content, position) VALUES (?, ?, ?, ?, ?)')
  const seen: Record<string, number> = {}
  sections.forEach((s, i) => {
    seen[s.type] = (seen[s.type] ?? 0) + 1
    const label = s.type === 'verse' ? `Verse ${seen[s.type]}` : NAMES[s.type]
    ins.run(songId, s.type, label, s.content, i)
  })
}

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN')
  try { const r = fn(); db.exec('COMMIT'); return r } catch (e) { db.exec('ROLLBACK'); throw e }
}

function insertSong(s: SongIn): number {
  return tx(() => {
    const r = db.prepare('INSERT INTO songs (title, artist, category, language, favorite) VALUES (?, ?, ?, ?, ?)')
      .run(s.title, s.artist, s.category, s.language, s.favorite)
    const id = Number(r.lastInsertRowid)
    writeSections(id, s.sections)
    return id
  })
}

export const guard = (fn: (req: Request, res: Response) => void) => (req: Request, res: Response) => {
  try { fn(req, res) } catch (e) { console.error(e); res.status(500).json({ error: 'Database error. Check the server console.' }) }
}

const getSong = (id: number) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!song) return null
  const sections = db.prepare('SELECT id, type, label, content FROM song_sections WHERE song_id = ? ORDER BY position').all(id)
  return { ...song, sections }
}

songsRouter.get('/', guard((req, res) => {
  const q = String(req.query.q ?? '').trim()
  const category = String(req.query.category ?? '')
  const where: string[] = []
  const args: string[] = []
  if (q) { where.push('(title LIKE ? OR artist LIKE ?)'); args.push(`%${q}%`, `%${q}%`) }
  if (category) { where.push('category = ?'); args.push(category) }
  if (req.query.favorite === '1') where.push('favorite = 1')
  const sql = `SELECT s.id, s.title, s.artist, s.category, s.language, s.favorite,
      (SELECT COUNT(*) FROM song_sections WHERE song_id = s.id) AS section_count
    FROM songs s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY title COLLATE NOCASE`
  res.json(db.prepare(sql).all(...args))
}))

songsRouter.get('/categories', guard((_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM songs ORDER BY category COLLATE NOCASE').all() as unknown as { category: string }[]
  res.json(rows.map(r => r.category))
}))

songsRouter.get('/export', guard((_req, res) => {
  const ids = db.prepare('SELECT id FROM songs ORDER BY title COLLATE NOCASE').all() as unknown as { id: number }[]
  const songs = ids.map(({ id }) => {
    const s = getSong(id) as Record<string, unknown> & { sections: { type: string; content: string }[] }
    return {
      title: s.title, artist: s.artist, category: s.category, language: s.language, favorite: s.favorite,
      sections: s.sections.map(x => ({ type: x.type, content: x.content })),
    }
  })
  res.setHeader('Content-Disposition', 'attachment; filename="worshipflow-songs.json"')
  res.json({ format: 'worshipflow-songs', version: 1, songs })
}))

songsRouter.post('/import', guard((req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.songs
  if (!Array.isArray(list)) return res.status(400).json({ error: 'This file is not a WorshipFlow song library.' })
  const exists = db.prepare('SELECT 1 FROM songs WHERE lower(title) = lower(?) AND lower(artist) = lower(?)')
  let added = 0, skipped = 0
  for (const item of list) {
    const s = parse(item)
    if (typeof s === 'string' || exists.get(s.title, s.artist)) { skipped++; continue }
    insertSong(s); added++
  }
  res.json({ added, skipped })
}))

songsRouter.get('/:id', guard((req, res) => {
  const song = getSong(Number(req.params.id))
  if (!song) return res.status(404).json({ error: 'Song not found. It may have been deleted.' })
  res.json(song)
}))

songsRouter.post('/', guard((req, res) => {
  const s = parse(req.body)
  if (typeof s === 'string') return res.status(400).json({ error: s })
  res.status(201).json(getSong(insertSong(s)))
}))

songsRouter.put('/:id', guard((req, res) => {
  const id = Number(req.params.id)
  if (!getSong(id)) return res.status(404).json({ error: 'Song not found. It may have been deleted.' })
  const s = parse(req.body)
  if (typeof s === 'string') return res.status(400).json({ error: s })
  tx(() => {
    db.prepare(`UPDATE songs SET title=?, artist=?, category=?, language=?, favorite=?, updated_at=datetime('now') WHERE id=?`)
      .run(s.title, s.artist, s.category, s.language, s.favorite, id)
    writeSections(id, s.sections)
  })
  res.json(getSong(id))
}))

songsRouter.post('/:id/favorite', guard((req, res) => {
  const r = db.prepare('UPDATE songs SET favorite = 1 - favorite WHERE id = ?').run(Number(req.params.id))
  if (!r.changes) return res.status(404).json({ error: 'Song not found.' })
  res.json({ ok: true })
}))

songsRouter.delete('/:id', guard((req, res) => {
  const r = db.prepare('DELETE FROM songs WHERE id = ?').run(Number(req.params.id))
  if (!r.changes) return res.status(404).json({ error: 'Song not found.' })
  res.json({ ok: true })
}))
