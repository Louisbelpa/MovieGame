/**
 * push-notification.service.ts
 * Sends daily challenge push notifications via APNs (iOS) and FCM (Android).
 *
 * Required env vars:
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8 (base64 .p8 key content)
 *   FCM_SERVICE_ACCOUNT (base64 JSON service account)
 *   PUSH_BUNDLE_ID (e.g. fr.guesstoday.app)
 *
 * Call sendDailyChallengeNotification() from the daily challenge scheduler
 * or from the admin route that activates a challenge.
 */

import db from '../db/database.js';
import https from 'node:https';
import { createSign } from 'node:crypto';

const BUNDLE_ID = process.env.PUSH_BUNDLE_ID ?? 'fr.guesstoday.app';

interface PushTokenRow {
  user_id: number;
  token: string;
  platform: 'ios' | 'android';
}

// ── APNs JWT helper ───────────────────────────────────────────────────────────

let apnsJwt: { token: string; issuedAt: number } | null = null;

function getApnsJwt(): string | null {
  const keyId   = process.env.APNS_KEY_ID;
  const teamId  = process.env.APNS_TEAM_ID;
  const keyP8B64 = process.env.APNS_KEY_P8;
  if (!keyId || !teamId || !keyP8B64) return null;

  const now = Math.floor(Date.now() / 1000);
  // Reuse token if <45 min old (APNs tokens valid for 1 h)
  if (apnsJwt && now - apnsJwt.issuedAt < 45 * 60) return apnsJwt.token;

  const keyContent = Buffer.from(keyP8B64, 'base64').toString('utf8');
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const sign = createSign('SHA256');
  sign.update(unsigned);
  const signature = sign.sign({ key: keyContent, dsaEncoding: 'ieee-p1363' }).toString('base64url');

  const token = `${unsigned}.${signature}`;
  apnsJwt = { token, issuedAt: now };
  return token;
}

// ── APNs send ─────────────────────────────────────────────────────────────────

async function sendApns(deviceToken: string, title: string, body: string): Promise<void> {
  const jwt = getApnsJwt();
  if (!jwt) return;

  const payload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default', badge: 1 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.push.apple.com',
      path: `/3/device/${deviceToken}`,
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
    }, (res) => {
      res.resume();
      if (res.statusCode === 200) resolve();
      else reject(new Error(`APNs error: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── FCM send ──────────────────────────────────────────────────────────────────

let fcmAccessToken: { token: string; expiresAt: number } | null = null;
let fcmServiceAccount: { client_email: string; private_key: string; project_id: string } | null = null;

function getFcmServiceAccount(): { client_email: string; private_key: string; project_id: string } | null {
  if (fcmServiceAccount) return fcmServiceAccount;
  const saB64 = process.env.FCM_SERVICE_ACCOUNT;
  if (!saB64) return null;
  try {
    fcmServiceAccount = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));
    return fcmServiceAccount;
  } catch {
    return null;
  }
}

async function getFcmAccessToken(): Promise<string | null> {
  const sa = getFcmServiceAccount();
  if (!sa) return null;

  const now = Date.now();
  if (fcmAccessToken && fcmAccessToken.expiresAt > now + 60_000) return fcmAccessToken.token;

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimset = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat, exp,
  })).toString('base64url');

  const unsigned = `${header}.${claimset}`;
  const sign = createSign('SHA256');
  sign.update(unsigned);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${sig}`;

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!resp.ok) return null;

  const data = (await resp.json()) as { access_token: string; expires_in: number };
  fcmAccessToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

async function sendFcm(deviceToken: string, title: string, body: string): Promise<void> {
  const sa = getFcmServiceAccount();
  if (!sa) return;

  const projectId = sa.project_id;
  const accessToken = await getFcmAccessToken();
  if (!accessToken) return;

  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      android: { notification: { channel_id: 'daily_challenge' } },
    },
  };

  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(message),
    },
  );
  if (!resp.ok) {
    throw new Error(`FCM error: ${resp.status}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendDailyChallengeNotification(
  title = '🎬 Nouveau défi disponible !',
  body  = 'Le défi du jour est prêt. Saurez-vous trouver ?',
): Promise<void> {
  const tokens = db
    .prepare<[], PushTokenRow>(`SELECT user_id, token, platform FROM push_tokens`)
    .all();

  if (tokens.length === 0) return;

  const results = await Promise.allSettled(
    tokens.map((row) =>
      row.platform === 'ios'
        ? sendApns(row.token, title, body)
        : sendFcm(row.token, title, body),
    ),
  );

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[push] ${tokens.length - failed}/${tokens.length} notifications sent, ${failed} failed`);
  } else {
    console.log(`[push] Sent ${tokens.length} push notifications`);
  }
}

export function registerPushToken(userId: number, token: string, platform: 'ios' | 'android'): void {
  db.prepare(
    `INSERT INTO push_tokens (user_id, token, platform)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, platform) DO UPDATE SET token = excluded.token`,
  ).run(userId, token, platform);
}
