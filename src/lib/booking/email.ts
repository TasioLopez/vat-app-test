import {
  APP_NAME,
  EMAIL_ACCENT,
  escapeHtml,
  getEmailPublicOrigin,
  getMailFrom,
  getMailTransport,
} from '@/lib/email/smtp';
import { formatBookingWhen } from '@/lib/booking/time';
import { spaceKindLabel, type SpaceKind } from '@/lib/booking/types';

export type BookingMailKind = 'confirmation' | 'cancellation';

export type BookingMailDetails = {
  bookerName: string;
  title: string;
  locationName: string;
  locationAddress?: string | null;
  spaceName: string;
  spaceKind: SpaceKind;
  startsAt: Date;
  endsAt: Date;
  note?: string | null;
  logoUrl?: string;
};

export type BookingMailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildBookingMessage(kind: BookingMailKind, details: BookingMailDetails): BookingMailContent {
  const when = formatBookingWhen(details.startsAt, details.endsAt);
  const kindLabel = spaceKindLabel(details.spaceKind);
  const place = details.locationAddress?.trim()
    ? `${details.locationName} (${details.locationAddress.trim()})`
    : details.locationName;
  const verb = kind === 'confirmation' ? 'bevestigd' : 'geannuleerd';
  const subject = `Reservering ${verb}: ${details.title}`;
  const intro =
    kind === 'confirmation'
      ? 'Uw reservering is bevestigd.'
      : 'Deze reservering is geannuleerd.';

  const lines = [
    `Beste ${details.bookerName},`,
    '',
    intro,
    '',
    `Titel: ${details.title}`,
    `Locatie: ${place}`,
    `${kindLabel}: ${details.spaceName}`,
    `Wanneer: ${when}`,
    `Gereserveerd door: ${details.bookerName}`,
  ];
  if (details.note?.trim()) {
    lines.push('', `Notitie: ${details.note.trim()}`);
  }
  lines.push('', `Deze e-mail is verzonden door ${APP_NAME}.`);

  const logoUrl = details.logoUrl ?? `${getEmailPublicOrigin()}/branding/vat-app-logo.svg`;
  const noteBlock = details.note?.trim()
    ? `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#334155;"><strong style="color:#0f172a;">Notitie:</strong> ${escapeHtml(details.note.trim())}</p>`
    : '';

  const html = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#334155;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e0f2fe;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:28px 24px 20px 24px;background-color:#f0f9fb;border-bottom:1px solid #e0f2fe;">
                <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(APP_NAME)}" width="180" style="display:block;border:0;outline:none;text-decoration:none;max-width:180px;height:auto;margin:0 auto 10px auto;" />
                <div style="font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_ACCENT};">${escapeHtml(APP_NAME)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;color:#0f172a;font-weight:700;">Reservering ${escapeHtml(verb)}</h1>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#334155;">Beste ${escapeHtml(details.bookerName)},</p>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#334155;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 16px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9fb;border:1px solid #bae6fd;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:15px;line-height:1.7;color:#0c4a6e;">
                      <strong style="color:#075985;">${escapeHtml(details.title)}</strong><br />
                      Locatie: ${escapeHtml(place)}<br />
                      ${escapeHtml(kindLabel)}: ${escapeHtml(details.spaceName)}<br />
                      Wanneer: ${escapeHtml(when)}<br />
                      Gereserveerd door: ${escapeHtml(details.bookerName)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px 24px;">
                ${noteBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 24px 24px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Deze e-mail is verzonden door ${escapeHtml(APP_NAME)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text: lines.join('\n'), html };
}

export async function sendBookingEmails(
  kind: BookingMailKind,
  recipients: string[],
  details: BookingMailDetails
): Promise<string[]> {
  const unique = [...new Set(recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return [];

  const from = getMailFrom();
  const transport = getMailTransport();
  const content = buildBookingMessage(kind, {
    ...details,
    logoUrl: details.logoUrl ?? `${getEmailPublicOrigin()}/branding/vat-app-logo.svg`,
  });
  const failures: string[] = [];
  for (const to of unique) {
    try {
      await transport.sendMail({
        from,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } catch (error) {
      console.error('Booking email failed', to, error);
      failures.push(to);
    }
  }
  return failures;
}
