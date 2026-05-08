import db from '../src/db/database.js'
import { fetchWikipediaData } from '../src/lib/wikipedia.js'

interface WikiRow {
  id: number
  wikipedia_slug: string
  name: string
}

const LIMIT = Math.max(0, parseInt(process.env.BACKFILL_LIMIT ?? '0', 10) || 0)
const SLEEP_MS = Math.max(300, parseInt(process.env.BACKFILL_SLEEP_MS ?? '1200', 10) || 1200)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const hasTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='wiki_persons'`)
    .get() as { name?: string } | undefined
  if (!hasTable?.name) {
    throw new Error('Table wiki_persons introuvable. Lance d’abord `npm run db:migrate` avec le bon DATABASE_PATH.')
  }

  const rows = (LIMIT > 0
    ? db.prepare<[number], WikiRow>(`SELECT id, wikipedia_slug, name FROM wiki_persons ORDER BY id ASC LIMIT ?`).all(LIMIT)
    : db.prepare<[], WikiRow>(`SELECT id, wikipedia_slug, name FROM wiki_persons ORDER BY id ASC`).all())

  console.log(`Backfill wiki_persons: ${rows.length} fiche(s), pause=${SLEEP_MS}ms`)

  let ok = 0
  let failed = 0
  const startedAt = Date.now()

  for (const row of rows) {
    try {
      const data = await fetchWikipediaData(row.wikipedia_slug, 'fr')
      db.prepare(`
        UPDATE wiki_persons
        SET
          name = ?,
          person_type = ?,
          infobox_data = ?,
          hint_schedule = ?,
          photo_url = ?,
          extract = ?,
          wikipedia_url = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
      `).run(
        data.name,
        data.person_type,
        JSON.stringify(data.infobox_data),
        JSON.stringify(data.hint_schedule),
        data.photo_url,
        data.extract,
        data.wikipedia_url,
        row.id
      )

      ok += 1
      console.log(`[OK] #${row.id} ${row.wikipedia_slug} -> ${data.person_type} (score ${data.parse_quality_score})`)
    } catch (err) {
      failed += 1
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`[ERR] #${row.id} ${row.wikipedia_slug} (${row.name}): ${msg}`)
    }
    await sleep(SLEEP_MS)
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  console.log(`Backfill terminé: ok=${ok}, failed=${failed}, durée=${elapsed}s`)
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(msg)
  process.exit(1)
})
