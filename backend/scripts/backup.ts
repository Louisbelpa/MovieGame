/**
 * backup.ts
 * Creates a timestamped SQLite backup using VACUUM INTO.
 * Usage: tsx scripts/backup.ts
 * Safe to run while the server is running (SQLite WAL mode handles concurrent reads).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import db from '../src/db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH ?? path.join(__dirname, '../data/moviegame.db');
const backupDir = path.join(path.dirname(dbPath), 'backups');

fs.mkdirSync(backupDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const backupPath = path.join(backupDir, `moviegame-${date}.db`);

console.log(`Backing up to ${backupPath}…`);
db.prepare(`VACUUM INTO ?`).run(backupPath);
db.close();
console.log('Backup complete.');
