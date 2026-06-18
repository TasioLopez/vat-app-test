import nodemailer from 'nodemailer';

type ShareEmailParams = {
  to: string;
  shareUrl: string;
  employeeName: string;
  advisorName: string;
  message?: string | null;
  expiresAt: Date;
};

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

/** Build RFC5322 From with display name, e.g. `"VAT App" <contact@vat-app.nl>`. */
function getMailFrom(): string {
  const address = (process.env.SMTP_FROM ?? process.env.SMTP_USER)?.trim();
  if (!address) throw new Error('SMTP_FROM is not configured');

  // Already formatted: "Name" <email@domain.com>
  if (/^[^<]*<[^>]+>$/.test(address)) {
    return address;
  }

  const name = (process.env.SMTP_FROM_NAME ?? 'VAT App').trim() || 'VAT App';
  return `"${name.replace(/"/g, '\\"')}" <${address}>`;
}

export async function sendCvShareEmail(params: ShareEmailParams): Promise<void> {
  const from = getMailFrom();

  const { to, shareUrl, employeeName, advisorName, message, expiresAt } = params;
  const expiryStr = formatDateNl(expiresAt);

  const messageBlock = message?.trim()
    ? `<p style="margin:16px 0;padding:12px;background:#f3f4f6;border-radius:6px;">${escapeHtml(message.trim())}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="nl">
<body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px;">Uw CV staat klaar voor review</h1>
  <p>Beste ${escapeHtml(employeeName)},</p>
  <p>${escapeHtml(advisorName)} heeft een CV met u gedeeld zodat u het kunt bekijken en aanpassen.</p>
  ${messageBlock}
  <p style="margin:24px 0;">
    <a href="${escapeHtml(shareUrl)}" style="display:inline-block;background:#00A3CC;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">
      CV openen
    </a>
  </p>
  <p style="font-size:14px;color:#555;">
    Open de link en bevestig uw e-mailadres om toegang te krijgen. De link is geldig tot ${escapeHtml(expiryStr)}.
  </p>
  <p style="font-size:12px;color:#888;margin-top:32px;">
    Als u deze e-mail niet verwachtte, kunt u deze negeren.
  </p>
</body>
</html>`;

  const text = [
    `Beste ${employeeName},`,
    '',
    `${advisorName} heeft een CV met u gedeeld zodat u het kunt bekijken en aanpassen.`,
    message?.trim() ? `\nBericht:\n${message.trim()}\n` : '',
    `Open de link en bevestig uw e-mailadres: ${shareUrl}`,
    `De link is geldig tot ${expiryStr}.`,
  ]
    .filter(Boolean)
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
