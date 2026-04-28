import db from '../db/database.js';

export function logAuditEvent(action: string, details: Record<string, unknown>): void {
  try {
    db.prepare(`INSERT INTO audit_logs (action, details) VALUES (?, ?)`).run(
      action,
      JSON.stringify(details)
    );
  } catch {
    // Non-blocking: an audit failure must never break the main operation
  }
}
