/**
 * database.ts
 * Singleton SQLite connection (better-sqlite3 – synchronous, perfect for
 * single-process Node.js servers like Express running on Railway/Render).
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH ?? path.join(__dirname, '../../data/moviegame.db');

// Ensure the data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, {
  // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Performance + safety settings applied once at connection time
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL'); // safe with WAL, much faster than FULL

export default db;
