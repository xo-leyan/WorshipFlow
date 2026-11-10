import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = path.join(here, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(path.join(DATA_DIR, 'worshipflow.db'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

const ts = `created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

db.exec(`
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  artist TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  language TEXT NOT NULL DEFAULT 'English' CHECK (language IN ('English','Filipino','Bilingual')),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0,1)),
  ${ts}
);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);

CREATE TABLE IF NOT EXISTS song_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('verse','chorus','pre-chorus','bridge','ending','intro','tag')),
  label TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sections_song ON song_sections(song_id, position);

CREATE TABLE IF NOT EXISTS presentations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  ${ts}
);

CREATE TABLE IF NOT EXISTS presentation_slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('song','bible','announcement','image','video','blank')),
  source_id INTEGER,
  content TEXT NOT NULL DEFAULT '',
  style_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slides_pres ON presentation_slides(presentation_id, position);

CREATE TABLE IF NOT EXISTS bible_books (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('OT','NT')),
  chapters INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bible_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation TEXT NOT NULL,
  book_id INTEGER NOT NULL REFERENCES bible_books(id),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (translation, book_id, chapter, verse)
);

CREATE TABLE IF NOT EXISTS media_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  folder TEXT NOT NULL DEFAULT 'General',
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS worship_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  service_date TEXT NOT NULL,
  ${ts}
);

CREATE TABLE IF NOT EXISTS worship_schedule_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES worship_schedules(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('prayer','song','scripture','announcement','sermon','closing-song','other')),
  title TEXT NOT NULL DEFAULT '',
  source_id INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_sched ON worship_schedule_items(schedule_id, position);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

const defaults: Record<string, string> = {
  church_name: 'My Church',
  church_logo: '',
  default_background: '#10131f',
  default_font: 'Segoe UI',
  default_font_size: '64',
  default_text_align: 'center',
  display_width: '1920',
  display_height: '1080',
  theme: 'dark',
}
const seed = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)')
for (const [k, v] of Object.entries(defaults)) seed.run(k, v)
