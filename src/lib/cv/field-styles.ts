import type { CvFieldStyle } from '@/types/cv';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHexColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  if (!HEX_RE.test(v)) return undefined;
  if (v.length === 4) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

export function normalizeFieldStyle(raw: unknown): CvFieldStyle | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const color = normalizeHexColor((raw as { color?: unknown }).color);
  if (!color) return undefined;
  return { color };
}

export function normalizeFieldStylesMap<K extends string>(
  raw: unknown,
  allowed: readonly K[]
): Partial<Record<K, CvFieldStyle>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Partial<Record<K, CvFieldStyle>> = {};
  let any = false;
  for (const key of allowed) {
    const style = normalizeFieldStyle((raw as Record<string, unknown>)[key]);
    if (style) {
      out[key] = style;
      any = true;
    }
  }
  return any ? out : undefined;
}

export const EXPERIENCE_STYLE_KEYS = ['role', 'organization', 'period', 'description'] as const;
export const EDUCATION_STYLE_KEYS = ['institution', 'diploma', 'period', 'description'] as const;
export const LANGUAGE_STYLE_KEYS = ['language', 'level'] as const;
export const LIST_STYLE_KEYS = ['text'] as const;
