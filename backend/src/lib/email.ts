/**
 * email.ts
 * Resend-backed transactional email helpers.
 * All functions are fire-and-forget safe — errors are logged, never thrown.
 *
 * Required env vars:
 *   RESEND_API_KEY  — Resend API key
 *   APP_URL         — Public frontend URL (e.g. https://guesstoday.fr)
 *   EMAIL_FROM      — Sender address (e.g. GuessToday <noreply@guesstoday.fr>)
 */

import { Resend } from 'resend';
import { logger } from './logger.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    resendClient = new Resend(key);
  }
  return resendClient;
}

const FROM = () => process.env.EMAIL_FROM ?? 'GuessToday <noreply@guesstoday.fr>';
const APP_URL = () => (process.env.APP_URL ?? 'https://guesstoday.fr').replace(/\/$/, '');

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
  displayName: string
): Promise<void> {
  const url = `${APP_URL()}/reset-password?token=${rawToken}`;
  try {
    await getClient().emails.send({
      from: FROM(),
      to,
      subject: 'Réinitialisation de ton mot de passe — GuessToday',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0d0d0d;color:#e5e5e5;border-radius:12px">
          <h1 style="font-size:22px;margin-bottom:8px;color:#d4a64a">GuessToday</h1>
          <p style="margin-bottom:16px">Salut <strong>${escapeHtml(displayName)}</strong>,</p>
          <p style="margin-bottom:24px">Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous — ce lien est valable <strong>1 heure</strong>.</p>
          <a href="${url}" style="display:inline-block;background:#d4a64a;color:#1a0f00;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top:24px;font-size:13px;color:#888">Si tu n'as pas fait cette demande, ignore cet e-mail. Ton mot de passe restera inchangé.</p>
          <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0"/>
          <p style="font-size:12px;color:#555">
            Lien direct : <a href="${url}" style="color:#d4a64a">${url}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send password reset email');
  }
}

export async function sendVerificationEmail(
  to: string,
  rawToken: string,
  displayName: string
): Promise<void> {
  const url = `${APP_URL()}/verify-email?token=${rawToken}`;
  try {
    await getClient().emails.send({
      from: FROM(),
      to,
      subject: 'Confirme ton adresse e-mail — GuessToday',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0d0d0d;color:#e5e5e5;border-radius:12px">
          <h1 style="font-size:22px;margin-bottom:8px;color:#d4a64a">GuessToday</h1>
          <p style="margin-bottom:16px">Salut <strong>${displayName}</strong>,</p>
          <p style="margin-bottom:24px">Bienvenue ! Confirme ton adresse e-mail pour sécuriser ton compte.</p>
          <a href="${url}" style="display:inline-block;background:#d4a64a;color:#1a0f00;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px">
            Confirmer mon adresse e-mail
          </a>
          <p style="margin-top:24px;font-size:13px;color:#888">Ce lien est valable <strong>24 heures</strong>. Si tu n'as pas créé de compte, ignore cet e-mail.</p>
          <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0"/>
          <p style="font-size:12px;color:#555">
            Lien direct : <a href="${url}" style="color:#d4a64a">${url}</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send verification email');
  }
}
