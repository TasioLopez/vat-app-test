import { coerceCvModelDisplay } from '@/lib/cv/format-display';
import {
  EDUCATION_STYLE_KEYS,
  EXPERIENCE_STYLE_KEYS,
  LANGUAGE_STYLE_KEYS,
  LIST_STYLE_KEYS,
  normalizeFieldStylesMap,
} from '@/lib/cv/field-styles';
import { normalizePhotoSizePx } from '@/lib/cv/photo-size';
import { getDefaultLayout } from '@/lib/cv/layout-presets';
import type {
  CvDocumentPayload,
  CvEducationItem,
  CvExperienceItem,
  CvLanguageItem,
  CvLayoutOptions,
  CvListItem,
  CvLocale,
  CvModel,
  CvPhotoCrop,
  CvSidebarPosition,
  CvTemplateKey,
} from '@/types/cv';
import { coerceCvTemplateKey, emptyCvModel, newCvId } from '@/types/cv';

function normalizeExperienceItem(raw: unknown): CvExperienceItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? o.id : newCvId();
  const styles = normalizeFieldStylesMap(o.styles, EXPERIENCE_STYLE_KEYS);
  return {
    id,
    role: typeof o.role === 'string' ? o.role : '',
    organization: typeof o.organization === 'string' ? o.organization : undefined,
    period: typeof o.period === 'string' ? o.period : undefined,
    description: typeof o.description === 'string' ? o.description : undefined,
    ...(styles ? { styles } : {}),
  };
}

function normalizeEducationItem(raw: unknown): CvEducationItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? o.id : newCvId();
  const styles = normalizeFieldStylesMap(o.styles, EDUCATION_STYLE_KEYS);
  return {
    id,
    institution: typeof o.institution === 'string' ? o.institution : '',
    diploma: typeof o.diploma === 'string' ? o.diploma : undefined,
    period: typeof o.period === 'string' ? o.period : undefined,
    description: typeof o.description === 'string' ? o.description : undefined,
    ...(styles ? { styles } : {}),
  };
}

function normalizeListItem(raw: unknown): CvListItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? o.id : newCvId();
  const styles = normalizeFieldStylesMap(o.styles, LIST_STYLE_KEYS);
  return {
    id,
    text: typeof o.text === 'string' ? o.text : '',
    ...(styles ? { styles } : {}),
  };
}

function normalizeLanguageItem(raw: unknown): CvLanguageItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? o.id : newCvId();
  const styles = normalizeFieldStylesMap(o.styles, LANGUAGE_STYLE_KEYS);
  return {
    id,
    language: typeof o.language === 'string' ? o.language : '',
    level: typeof o.level === 'string' ? o.level : undefined,
    ...(styles ? { styles } : {}),
  };
}

function normalizePhotoCrop(raw: unknown): CvPhotoCrop | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.width);
  const h = Number(o.height);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return undefined;
  if (w <= 0 || h <= 0) return undefined;
  const zoom = o.zoom !== undefined ? Number(o.zoom) : undefined;
  const crop: CvPhotoCrop = { x, y, width: w, height: h };
  if (zoom !== undefined && Number.isFinite(zoom) && zoom >= 1) {
    crop.zoom = zoom;
  }
  return crop;
}

function normalizeCvModelRaw(o: Record<string, unknown>): CvModel {
  const personalRaw =
    o.personal && typeof o.personal === 'object' ? (o.personal as Record<string, unknown>) : undefined;
  const personal = personalRaw as CvModel['personal'] | undefined;
  const optionsRaw = o.options && typeof o.options === 'object' ? (o.options as CvModel['options']) : undefined;
  const hasPhotoPath = Boolean(personal?.photoStoragePath?.trim());
  const includePhotoInCv =
    optionsRaw?.includePhotoInCv === false
      ? false
      : optionsRaw?.includePhotoInCv === true
        ? true
        : hasPhotoPath;

  const photoCrop = normalizePhotoCrop(personalRaw?.photoCrop);
  const photoSizePx = normalizePhotoSizePx(personalRaw?.photoSizePx);

  const base: CvModel = {
    personal: {
      fullName: personal?.fullName ?? '',
      title: personal?.title ?? '',
      email: personal?.email ?? '',
      phone: personal?.phone ?? '',
      location: personal?.location ?? '',
      dateOfBirth: personal?.dateOfBirth,
      photoUrl: personal?.photoUrl,
      photoStoragePath: personal?.photoStoragePath,
      ...(photoCrop ? { photoCrop } : {}),
      ...(photoSizePx !== undefined ? { photoSizePx } : {}),
    },
    profile: typeof o.profile === 'string' ? o.profile : '',
    experience: Array.isArray(o.experience)
      ? o.experience.map(normalizeExperienceItem).filter((x): x is CvExperienceItem => x != null)
      : [],
    education: Array.isArray(o.education)
      ? o.education.map(normalizeEducationItem).filter((x): x is CvEducationItem => x != null)
      : [],
    skills: Array.isArray(o.skills)
      ? o.skills.map(normalizeListItem).filter((x): x is CvListItem => x != null)
      : [],
    languages: Array.isArray(o.languages)
      ? o.languages.map(normalizeLanguageItem).filter((x): x is CvLanguageItem => x != null)
      : [],
    interests: Array.isArray(o.interests)
      ? o.interests.map(normalizeListItem).filter((x): x is CvListItem => x != null)
      : [],
    extra: typeof o.extra === 'string' ? o.extra : '',
    digitalSkills: typeof o.digitalSkills === 'string' ? o.digitalSkills : undefined,
    options: {
      includePhotoInCv,
    },
  };

  const coerced = coerceCvModelDisplay(base);
  return {
    ...base,
    digitalSkills: coerced.digitalSkills,
    skills: coerced.skills,
    languages: coerced.languages,
  };
}

/** Normalize a single CvModel content slice. */
export function normalizeCvModel(raw: unknown): CvModel {
  if (!raw || typeof raw !== 'object') {
    return emptyCvModel();
  }
  return normalizeCvModelRaw(raw as Record<string, unknown>);
}

export function getActiveCvModel(payload: CvDocumentPayload): CvModel {
  const locale = payload.activeLocale;
  if (locale === 'en' && payload.content.en) {
    return normalizeCvModel(payload.content.en);
  }
  return normalizeCvModel(payload.content.nl);
}

function isV2Payload(raw: Record<string, unknown>): boolean {
  return raw.schemaVersion === 2 && raw.content != null && Array.isArray(raw.layout);
}

function normalizeSidebarPosition(raw: unknown): CvSidebarPosition {
  return raw === 'right' ? 'right' : 'left';
}

function normalizeLayoutOptions(raw: unknown): CvLayoutOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const sidebarPosition = normalizeSidebarPosition(o.sidebarPosition);
  const fontFamily =
    typeof o.fontFamily === 'string' && o.fontFamily.trim() ? o.fontFamily.trim() : undefined;
  return {
    sidebarPosition,
    ...(fontFamily ? { fontFamily } : {}),
  };
}

/** Client/server safe normalization for JSON from DB → v2 payload. */
export function normalizeCvPayload(
  raw: unknown,
  templateKey: CvTemplateKey = 'modern_professional'
): CvDocumentPayload {
  if (!raw || typeof raw !== 'object') {
    const nl = emptyCvModel();
    return {
      schemaVersion: 2,
      activeLocale: 'nl',
      content: { nl },
      layout: getDefaultLayout(templateKey),
    };
  }

  const o = raw as Record<string, unknown>;

  if (isV2Payload(o)) {
    const activeLocale: CvLocale = o.activeLocale === 'en' ? 'en' : 'nl';
    const contentRaw = o.content as Record<string, unknown>;
    const nl = normalizeCvModel(contentRaw?.nl ?? contentRaw);
    const en = contentRaw?.en != null ? normalizeCvModel(contentRaw.en) : undefined;
    const layout = Array.isArray(o.layout)
      ? (o.layout as CvDocumentPayload['layout'])
      : getDefaultLayout(templateKey);
    const customSections =
      o.customSections && typeof o.customSections === 'object'
        ? (o.customSections as CvDocumentPayload['customSections'])
        : undefined;
    const layoutOptions = normalizeLayoutOptions(o.layoutOptions);

    return {
      schemaVersion: 2,
      activeLocale,
      content: { nl, ...(en ? { en } : {}) },
      layout,
      ...(customSections ? { customSections } : {}),
      ...(layoutOptions ? { layoutOptions } : {}),
    };
  }

  const nl = normalizeCvModelRaw(o);
  return {
    schemaVersion: 2,
    activeLocale: 'nl',
    content: { nl },
    layout: getDefaultLayout(coerceCvTemplateKey(templateKey)),
  };
}

/** @deprecated Use normalizeCvPayload + getActiveCvModel */
export function normalizeCvPayloadLegacy(raw: unknown): CvModel {
  return getActiveCvModel(normalizeCvPayload(raw));
}
