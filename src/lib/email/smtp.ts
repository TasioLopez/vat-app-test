import nodemailer from 'nodemailer';
import { getConfiguredServerAuthOrigin, normalizeAuthOrigin } from '@/lib/auth/auth-origin';

export const APP_NAME = 'VAT App';
export const EMAIL_ACCENT = '#00A3CC';

export function getMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/** Public site origin for logo/assets in emails. */
export function getEmailPublicOrigin(): string {
  const fromEnv = process.env.APP_PUBLIC_URL?.trim();
  if (fromEnv) return normalizeAuthOrigin(fromEnv);
  const fromAuth = getConfiguredServerAuthOrigin();
  if (fromAuth) return fromAuth;
  return 'https://www.vat-app.nl';
}

/** Build RFC5322 From with display name, e.g. `"VAT App" <contact@vat-app.nl>`. */
export function getMailFrom(): string {
  const address = (process.env.SMTP_FROM ?? process.env.SMTP_USER)?.trim();
  if (!address) throw new Error('SMTP_FROM is not configured');

  if (/^[^<]*<[^>]+>$/.test(address)) {
    return address;
  }

  const name = (process.env.SMTP_FROM_NAME ?? APP_NAME).trim() || APP_NAME;
  return `"${name.replace(/"/g, '\\"')}" <${address}>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
