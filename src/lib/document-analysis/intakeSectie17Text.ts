import {
  detectDriversLicenseFromIntakeText,
  detectTransportFromIntakeText,
} from './intakeCheckboxText';

const CHECKED = /[☒☑✓✔]/;
const UNCHECKED = /[☐□]/;

function normalizeIntakeText(text: string): string {
  return text.replace(/\u00a0/g, ' ');
}

function levelFromGlyphTriple(glyphs: string[]): string | null {
  if (glyphs.length < 3) return null;
  const [g, r, o] = glyphs;
  if (CHECKED.test(g!) && UNCHECKED.test(r!) && UNCHECKED.test(o!)) return 'Goed';
  if (UNCHECKED.test(g!) && CHECKED.test(r!) && UNCHECKED.test(o!)) return 'Gemiddeld';
  if (UNCHECKED.test(g!) && UNCHECKED.test(r!) && CHECKED.test(o!)) return 'Niet goed';
  // Single checked mark without requiring others unchecked
  if (CHECKED.test(g!)) return 'Goed';
  if (CHECKED.test(r!)) return 'Gemiddeld';
  if (CHECKED.test(o!)) return 'Niet goed';
  return null;
}

/**
 * Nederlands row: Spreken / Schrijven / Lezen × G R O (9 checkbox glyphs).
 */
export function detectDutchLevelsFromIntakeText(
  text: string | null | undefined
): {
  dutch_speaking?: string;
  dutch_writing?: string;
  dutch_reading?: string;
} | null {
  if (!text) return null;
  const normalized = normalizeIntakeText(text);
  const rowMatch = normalized.match(
    /Nederlands\s+([\s\S]{0,120}?)(?=Engels\b|Overig\b|Duits\b|Belangrijke\b|$)/i
  );
  const row = rowMatch?.[1] ?? '';
  const glyphs = [...row.matchAll(/[☒☑✓✔☐□]/g)].map((m) => m[0]!);
  if (glyphs.length < 3) return null;

  const speaking = levelFromGlyphTriple(glyphs.slice(0, 3));
  const writing = levelFromGlyphTriple(glyphs.slice(3, 6));
  const reading = levelFromGlyphTriple(glyphs.slice(6, 9));

  const out: {
    dutch_speaking?: string;
    dutch_writing?: string;
    dutch_reading?: string;
  } = {};
  if (speaking) out.dutch_speaking = speaking;
  if (writing) out.dutch_writing = writing;
  if (reading) out.dutch_reading = reading;
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Computervaardigheden block + PC/laptop checkbox.
 */
export function detectComputerFromIntakeText(
  text: string | null | undefined
): { has_computer?: boolean; computer_skills?: string } | null {
  if (!text) return null;
  const normalized = normalizeIntakeText(text);
  const out: { has_computer?: boolean; computer_skills?: string } = {};

  if (/[☒☑✓✔]\s*Werknemer beschikt over een PC/i.test(normalized)) {
    out.has_computer = true;
  } else if (/[☐□]\s*Werknemer beschikt over een PC/i.test(normalized)) {
    out.has_computer = false;
  }

  // Prefer Computervaardigheden section to avoid Typvaardigheden "Goed/Expert"
  const skillsBlock =
    normalized.match(
      /Computervaardigheden\s*([\s\S]{0,500}?)(?=Typvaardigheden\b|Rijbewijzen\b|Hoe verplaatst\b|$)/i
    )?.[1] ?? normalized;

  const skillRules: { re: RegExp; value: string }[] = [
    { re: /[☒☑✓✔]\s*Expert\s*\(/i, value: '5' },
    { re: /[☒☑✓✔]\s*Geavanceerd\b/i, value: '4' },
    { re: /[☒☑✓✔]\s*Gemiddeld\s*\(/i, value: '3' },
    { re: /[☒☑✓✔]\s*Basis\b/i, value: '2' },
    { re: /[☒☑✓✔]\s*Geen\b/i, value: '1' },
  ];
  for (const rule of skillRules) {
    if (rule.re.test(skillsBlock)) {
      out.computer_skills = rule.value;
      break;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

/** Excerpt of intake text focused on sectie-17 style blocks (for model grounding). */
export function extractIntakeSectie17TextExcerpt(text: string, maxLen = 3500): string {
  const normalized = normalizeIntakeText(text);
  const start =
    normalized.search(/Digitale vaardigheden|Computervaardigheden|Rijbewijzen|Hoe verplaatst/i);
  const slice = start >= 0 ? normalized.slice(start) : normalized;
  return slice.length > maxLen ? slice.slice(0, maxLen) : slice;
}

export type IntakeTextFillResult = {
  filled: string[];
  transport?: string[];
  license?: string[];
};

/**
 * Fill missing sectie-17 fields from intake plain text when detectors are confident.
 * Never deletes existing model values (non-destructive).
 */
export function fillEmployeeDetailsFromIntakeText(
  mapped: Record<string, unknown>,
  text: string | null | undefined
): IntakeTextFillResult {
  const filled: string[] = [];
  if (!text?.trim()) return { filled };

  const transport = detectTransportFromIntakeText(text);
  if (transport !== null) {
    mapped.transport_type = transport;
    filled.push('transport_type');
  }

  const licenses = detectDriversLicenseFromIntakeText(text);
  if (licenses !== null) {
    mapped.drivers_license_type = licenses;
    mapped.drivers_license = licenses.length > 0;
    filled.push('drivers_license_type');
  }

  const dutch = detectDutchLevelsFromIntakeText(text);
  if (dutch) {
    for (const key of ['dutch_speaking', 'dutch_writing', 'dutch_reading'] as const) {
      if (dutch[key]) {
        mapped[key] = dutch[key];
        filled.push(key);
      }
    }
  }

  const computer = detectComputerFromIntakeText(text);
  if (computer) {
    if (computer.has_computer !== undefined) {
      mapped.has_computer = computer.has_computer;
      filled.push('has_computer');
    }
    if (computer.computer_skills) {
      mapped.computer_skills = computer.computer_skills;
      filled.push('computer_skills');
    }
  }

  return {
    filled,
    transport: transport ?? undefined,
    license: licenses ?? undefined,
  };
}
