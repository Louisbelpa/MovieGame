/**
 * migrate.ts
 * Reads schema.sql and executes it against the SQLite database.
 * Safe to run multiple times (all statements use CREATE … IF NOT EXISTS).
 *
 * Usage: tsx src/db/migrate.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import db from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('Running migrations…');
db.exec(schema);

// Incremental migrations — safe to re-run (guarded by try/catch)
const incremental: { name: string; sql: string }[] = [
  {
    name: 'add_fame_level',
    sql: `ALTER TABLE films ADD COLUMN fame_level INTEGER NOT NULL DEFAULT 3 CHECK (fame_level BETWEEN 1 AND 5)`,
  },
]

for (const { name, sql } of incremental) {
  try {
    db.prepare(sql).run()
    console.log(`  ✓ ${name}`)
  } catch {
    // column already exists — ignore
  }
}

console.log('Migrations complete.');

db.close();
