/**
 * scripts/reset.ts
 * Drops all data and re-applies the schema. Use before re-seeding from scratch.
 *
 * Usage: tsx scripts/reset.ts
 * WARNING: This DELETES all data in the database. Use only in development.
 */

import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: reset.ts must not be run in production.');
  process.exit(1);
}

import db from '../src/db/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Resetting database…');

// Drop all known tables in dependency order
db.exec(`
  DROP TABLE IF EXISTS global_stats;
  DROP TABLE IF EXISTS game_sessions;
  DROP TABLE IF EXISTS daily_challenges;
  DROP TABLE IF EXISTS films;
  DROP TRIGGER IF EXISTS trg_session_finished;
`);

// Re-apply schema
const schemaPath = path.join(__dirname, '../src/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

console.log('Database reset complete. Run `npm run db:seed` to re-populate.');

db.close();
