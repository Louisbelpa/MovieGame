import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Persisted uploads (same Docker volume as the DB recommended: e.g. /data/uploads).
 * Default remains backend/public/uploads for local dev compatibility.
 */
export function getUploadsAbsDir(): string {
  const raw = process.env.UPLOADS_DIRECTORY?.trim();
  if (raw)
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  return path.join(__dirname, '../../public/uploads');
}

export function ensureUploadsDir(): void {
  const dir = getUploadsAbsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
