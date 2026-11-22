/**
 * Deterministic bedrijfsarts / VA extraction from FML or spreekuur plain text
 * when TP2 intakeformulier extraction left occupational_doctor_org empty.
 */

function titleFromRoleWord(word: string): string {
  const w = word.toLowerCase();
  if (w.startsWith('bedrijfsarts') || w === 'ba') return 'Bedrijfsarts';
  if (w.startsWith('verzekeringsarts') || w === 'va') return 'Verzekeringsarts';
  if (w.startsWith('aios')) return 'Aios';
  if (w.startsWith('anios')) return 'Anios';
  if (w === 'arts') return 'Arts';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function cleanName(raw: string): string {
  return raw
    .replace(/\bBIG\b[:\s]*\d+/gi, '')
    .replace(/\d{8,}/g, '')
    .replace(/[.,;:\-]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parse arts phrase from FML "Naam arts…" / spreekuur signature lines.
 * Returns null when no clear name is found.
 */
export function extractArtsOrgFromPlainText(text: string | null | undefined): string | null {
  if (!text || !text.trim()) return null;
  const normalized = text.replace(/\u00a0/g, ' ');

  // FML: "Naam artsB Droogleever, Bedrijfsarts, 29020730801" (space often missing after "arts")
  const naamArts = normalized.match(
    /Naam\s*arts\s*[:\s]*([A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ.\-']*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ.\-']*){0,4})\s*[,.]?\s*(Bedrijfsarts|Verzekeringsarts|Arts|Aios|Anios|BA|VA)?/i
  );
  if (naamArts) {
    const name = cleanName(naamArts[1]);
    const roleRaw = naamArts[2] || 'Bedrijfsarts';
    if (name && name.length >= 2) {
      const title = titleFromRoleWord(roleRaw);
      if (/^(Bedrijfsarts|Verzekeringsarts|Arts|Aios|Anios)$/i.test(name.split(/\s+/)[0])) {
        return cleanName(`${name}`);
      }
      return cleanName(`${title} ${name}`);
    }
  }

  // Spreekuur / closing: "B. Droogleever, bedrijfsarts ,  29020730801"
  const signature = normalized.match(
    /(?:Met vriendelijke groet|Ondertekening)[\s\S]{0,120}?([A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ.\-']*(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ.\-']*){0,4})\s*,\s*(bedrijfsarts|verzekeringsarts|arts|aios|anios)\b/i
  );
  if (signature) {
    const name = cleanName(signature[1]);
    const title = titleFromRoleWord(signature[2]);
    if (name && name.length >= 2) return cleanName(`${title} ${name}`);
  }

  // Loose: "Name, bedrijfsarts" near end of document
  const loose = normalized.match(
    /([A-ZÀ-ÖØ-Þ](?:\.|[A-Za-zÀ-öø-ÿ\-']+)(?:\s+[A-ZÀ-ÖØ-Þ][A-Za-zÀ-öø-ÿ.\-']*){0,4})\s*,\s*(bedrijfsarts|verzekeringsarts)\b/i
  );
  if (loose) {
    const name = cleanName(loose[1]);
    const title = titleFromRoleWord(loose[2]);
    // Avoid matching disclaimer "de bedrijfsarts"
    if (name && !/^(de|een|uw|het)$/i.test(name) && name.length >= 2) {
      return cleanName(`${title} ${name}`);
    }
  }

  return null;
}
