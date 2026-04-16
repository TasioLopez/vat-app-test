/**
 * Canonical CV content model (stored in cv_documents.payload_json).
 * Template components render from this shape only.
 */

export type CvTemplateKey = 'modern_professional' | 'creative_bold' | 'corporate_minimal';

export const CV_TEMPLATE_KEYS: CvTemplateKey[] = [
  'modern_professional',
  'creative_bold',
  'corporate_minimal',
];

export const DEFAULT_ACCENT_COLOR = '#00A3CC';

export type CvExperienceItem = {
  id: string;
  role: string;
  organization?: string;
  period?: string;
  description?: string;
};

export type CvEducationItem = {
  id: string;
  institution: string;
  diploma?: string;
  period?: string;
  description?: string;
};

export type CvListItem = { id: string; text: string };

export type CvLanguageItem = {
  id: string;
  language: string;
  level?: string;
};

export type CvPersonal = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  dateOfBirth?: string;
  /** @deprecated Prefer photoStoragePath; legacy signed/public URL */
  photoUrl?: string;
  /** Supabase Storage path inside bucket `cv-photos` (e.g. employeeId/cvId/file.jpg) */
  photoStoragePath?: string;
};

/** Display and export options persisted with the CV */
export type CvModelOptions = {
  /** When true and photoStoragePath is set, templates show the photo */
  includePhotoInCv?: boolean;
};

export type CvModel = {
  personal: CvPersonal;
  /** Profiel / samenvatting */
  profile: string;
  experience: CvExperienceItem[];
  education: CvEducationItem[];
  skills: CvListItem[];
  languages: CvLanguageItem[];
  interests: CvListItem[];
  /** Vrij tekstblok (rijbewijs, beschikbaarheid, etc.) */
  extra: string;
  options?: CvModelOptions;
};

export function newCvId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function emptyCvModel(): CvModel {
  return {
    personal: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
    },
    profile: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    interests: [],
    extra: '',
    options: { includePhotoInCv: false },
  };
}
