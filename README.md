# WorshipFlow

Requires Node 22.13+ (uses the built-in `node:sqlite`, no native build tools needed).
Node prints an "experimental SQLite" notice on startup; it is harmless.

    npm install
    npm run dev        # API on :3001, web on http://localhost:5173
    npm run typecheck

Data lives in `server/data/worshipflow.db` and persists across restarts.

Status: Phase 1 complete (schema, API, shell, dashboard). Phases 2-7 pending.
