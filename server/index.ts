import express from 'express'
import cors from 'cors'
import { db } from './db.js'
import { songsRouter } from './songs.js'
import { presentationsRouter } from './presentations.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as unknown as { n: number }).n

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/dashboard', (_req, res) => {
  res.json({
    totals: {
      songs: count('songs'),
      verses: count('bible_verses'),
      presentations: count('presentations'),
      schedules: count('worship_schedules'),
      media: count('media_files'),
    },
    recentSongs: db.prepare(
      'SELECT id, title, artist, category, created_at FROM songs ORDER BY created_at DESC, id DESC LIMIT 5'
    ).all(),
    recentSchedules: db.prepare(
      'SELECT id, title, service_date FROM worship_schedules ORDER BY service_date DESC, id DESC LIMIT 5'
    ).all(),
  })
})

app.get('/api/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as unknown as { key: string; value: string }[]
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

app.put('/api/settings', (req, res) => {
  const body = req.body as Record<string, unknown>
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Send a JSON object of settings.' })
  const upsert = db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  )
  try {
    db.exec('BEGIN')
    for (const [k, v] of Object.entries(body)) upsert.run(k, String(v))
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    return res.status(500).json({ error: 'Could not save settings.' })
  }
  res.json({ ok: true })
})

app.use('/api/songs', songsRouter)
app.use('/api/presentations', presentationsRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route.' }))

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => console.log(`WorshipFlow API on http://localhost:${PORT}`))
