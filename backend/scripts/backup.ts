import 'dotenv/config'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_BACKUP !== 'true') {
  // Safety: require explicit opt-in in production to avoid accidental runs
}

const dbPath = process.env.DATABASE_PATH ?? './data/moviegame.db'
const backupDir = path.join(path.dirname(dbPath), 'backups')

fs.mkdirSync(backupDir, { recursive: true })

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const backupPath = path.join(backupDir, `moviegame-${timestamp}.db`)

const db = new Database(dbPath, { readonly: true })
try {
  db.prepare(`VACUUM INTO ?`).run(backupPath)
  console.log(`Backup created: ${backupPath}`)
} finally {
  db.close()
}
