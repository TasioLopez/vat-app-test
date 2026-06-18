import nodemailer from 'nodemailer';
import { getConfiguredServerAuthOrigin, normalizeAuthOrigin } from '@/lib/auth/auth-origin';

type ShareEmailParams = {
  to: string;
  shareUrl: string;
  employeeName: string;
  advisorName: string;
  message?: string | null;
  expiresAt: Date;
};

const APP_NAME = 'VAT App';
const ACCENT = '#00A3CC';

function getTransport() {
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

function formatDateNl(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
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
function getMailFrom(): string {
  const address = (process.env.SMTP_FROM ?? process.env.SMTP_USER)?.trim();
  if (!address) throw new Error('SMTP_FROM is not configured');

  if (/^[^<]*<[^>]+>$/.test(address)) {
    return address;
  }

  const name = (process.env.SMTP_FROM_NAME ?? APP_NAME).trim() || APP_NAME;
  return `"${name.replace(/"/g, '\\"')}" <${address}>`;
}

function buildShareEmailHtml(params: {
  employeeName: string;
  advisorName: string;
  message?: string | null;
  shareUrl: string;
  expiryStr: string;
  logoUrl: string;
}): string {
  const { employeeName, advisorName, message, shareUrl, expiryStr, logoUrl } = params;

  const advisorMessageBlock = message?.trim()
    ? `
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9fb; border:1px solid #bae6fd; border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px; font-size:15px; line-height:1.6; color:#0c4a6e;">
                      <strong style="color:#075985;">Bericht van ${escapeHtml(advisorName)}:</strong><br />
                      ${escapeHtml(message.trim())}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Uw CV staat klaar voor review — ${escapeHtml(APP_NAME)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#334155;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e0f2fe;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:28px 24px 20px 24px;background-color:#f0f9fb;border-bottom:1px solid #e0f2fe;">
                <img
                  src="${escapeHtml(logoUrl)}"
                  alt="${escapeHtml(APP_NAME)}"
                  width="180"
                  style="display:block;border:0;outline:none;text-decoration:none;max-width:180px;height:auto;margin:0 auto 10px auto;"
                />
                <div style="font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${ACCENT};">
                  ${escapeHtml(APP_NAME)}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;color:#0f172a;font-weight:700;">
                  Uw CV staat klaar voor review
                </h1>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#334155;">Beste ${escapeHtml(employeeName)},</p>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#334155;">
                  <strong style="color:#0f172a;">${escapeHtml(advisorName)}</strong> heeft een CV met u gedeeld zodat u het kunt bekijken en aanpassen.
                </p>
              </td>
            </tr>

            ${advisorMessageBlock}

            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9fb;border:1px solid #bae6fd;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:15px;line-height:1.6;color:#0c4a6e;">
                      <strong style="color:#075985;">Toegang:</strong> Open de link en bevestig uw e-mailadres om het CV te bewerken.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 24px 24px 24px;">
                <a
                  href="${escapeHtml(shareUrl)}"
                  style="display:inline-block;background-color:${ACCENT};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;line-height:1;padding:14px 28px;border-radius:8px;"
                >
                  CV openen
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
                  <tr>
                    <td style="padding:12px 14px;font-size:14px;line-height:1.6;color:#92400e;">
                      <strong>Let op:</strong> Deze link is geldig tot ${escapeHtml(expiryStr)}.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 20px 24px;">
                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#64748b;">
                  Werkt de knop niet? Kopieer en plak deze link handmatig in uw browser:
                </p>
                <p style="margin:0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:12px;line-height:1.5;color:#0f172a;">
                  ${escapeHtml(shareUrl)}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 24px 24px 24px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#64748b;">
                  Deze e-mail is verzonden door ${escapeHtml(APP_NAME)}.
                </p>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#64748b;">
                  Als u deze e-mail niet verwachtte, kunt u deze negeren.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">© ${new Date().getFullYear()} ${escapeHtml(APP_NAME)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendCvShareEmail(params: ShareEmailParams): Promise<void> {
  const from = getMailFrom();
  const origin = getEmailPublicOrigin();
  const logoUrl = `${origin}/branding/vat-app-logo.svg`;

  const { to, shareUrl, employeeName, advisorName, message, expiresAt } = params;
  const expiryStr = formatDateNl(expiresAt);

  const html = buildShareEmailHtml({
    employeeName,
    advisorName,
    message,
    shareUrl,
    expiryStr,
    logoUrl,
  });

  const text = [
    `Beste ${employeeName},`,
    '',
    `${advisorName} heeft een CV met u gedeeld zodat u het kunt bekijken en aanpassen.`,
    message?.trim() ? `\nBericht van ${advisorName}:\n${message.trim()}\n` : '',
    `Open de link en bevestig uw e-mailadres om toegang te krijgen:`,
    shareUrl,
    '',
    `De link is geldig tot ${expiryStr}.`,
    '',
    `Deze e-mail is verzonden door ${APP_NAME}.`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const transport = getTransport();
  await transport.sendMail({
    from,
    to,
    subject: 'Uw CV staat klaar voor review',
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
