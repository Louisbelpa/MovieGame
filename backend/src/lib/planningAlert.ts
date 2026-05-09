/**
 * Alerte e-mail optionnelle lorsque trop de jours restent sans planning (30j).
 * Nécessite Resend : RESEND_API_KEY, PLANNING_ALERT_FROM, PLANNING_ALERT_EMAIL.
 */

import db from '../db/database.js';
import { logger } from './logger.js';

const SETTING_LAST_SENT = 'planning_alert_last_sent_at';

export async function maybeSendPlanningAlert(params: {
  unscheduledFilm: number;
  unscheduledSeries: number;
  unscheduledWiki: number;
}): Promise<void> {
  if (process.env.PLANNING_ALERT_ENABLED === '0' || process.env.PLANNING_ALERT_ENABLED === 'false') {
    return;
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const toRaw = process.env.PLANNING_ALERT_EMAIL?.trim();
  const from = process.env.PLANNING_ALERT_FROM?.trim();
  if (!apiKey || !toRaw || !from) {
    return;
  }

  const threshold = Math.max(
    1,
    parseInt(process.env.PLANNING_ALERT_THRESHOLD ?? '8', 10) || 8,
  );
  const maxEmpty = Math.max(
    params.unscheduledFilm,
    params.unscheduledSeries,
    params.unscheduledWiki,
  );
  if (maxEmpty < threshold) {
    return;
  }

  const cooldownHours = Math.max(
    1,
    parseInt(process.env.PLANNING_ALERT_COOLDOWN_HOURS ?? '24', 10) || 24,
  );
  const lastRow = db
    .prepare<[string], { value: string } | undefined>(`SELECT value FROM app_settings WHERE key = ?`)
    .get(SETTING_LAST_SENT);
  if (lastRow?.value) {
    const last = Date.parse(lastRow.value);
    if (!Number.isNaN(last) && Date.now() - last < cooldownHours * 3600 * 1000) {
      return;
    }
  }

  const subject = `[Admin] Planning : jusqu’à ${maxEmpty} jour(s) vide(s) sur les 30 prochains`;
  const html = `
    <p>Bonjour,</p>
    <p>Jours sans entrée planifiée sur les <strong>30 jours calendaires suivants</strong> (hors aujourd’hui, fuseau Paris) :</p>
    <ul>
      <li>Films : <strong>${params.unscheduledFilm}</strong></li>
      <li>Séries : <strong>${params.unscheduledSeries}</strong></li>
      <li>Personnalités (wiki) : <strong>${params.unscheduledWiki}</strong></li>
    </ul>
    <p>Seuil d’alerte : ${threshold} jour(s) max.</p>
    <p>— Message automatique (GuessToday / CinéGuessr admin)</p>
  `.trim();

  const recipients = toRaw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, 'planning alert: Resend API error');
      return;
    }

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    ).run(SETTING_LAST_SENT, new Date().toISOString());
    logger.info({ maxEmpty, threshold }, 'planning alert email sent');
  } catch (err) {
    logger.error({ err }, 'planning alert: send failed');
  }
}
