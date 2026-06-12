/**
 * Canonical CV content model (stored in cv_documents.payload_json).
 * Template components render from this shape only.
 */

export type CvTemplateKey =
  | 'modern_professional'
  | 'creative_bold'
  | 'corporate_minimal'
  | 'linear_timeline'
  | 'balanced_split';

export const CV_TEMPLATE_KEYS: CvTemplateKey[] = [
  'modern_professional',
  'creative_bold',
  'corporate_minimal',
  'linear_timeline',
  'balanced_split',
];

/** Crop window as percentages of natural image (0–100), from react-easy-crop `Area` */
export type CvPhotoCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Zoom used in the crop editor (≥ 1) */
  zoom?: number;
};

export function coerceCvTemplateKey(raw: string | undefined | null): CvTemplateKey {
  if (raw && (CV_TEMPLATE_KEYS as readonly string[]).includes(raw)) {
    return raw as CvTemplateKey;
  }
  return 'modern_professional';
}

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
  /** Framing inside the photo frame (editor / print / PDF) */
  photoCrop?: CvPhotoCrop;
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
  /** Formatted PC/digital literacy (seeded from employee_details.computer_skills) */
  digitalSkills?: string;
  options?: CvModelOptions;
};

export type CvLocale = 'nl' | 'en';

export type CvSectionType =
  | 'personal_header'
  | 'contact'
  | 'photo'
  | 'profile'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'interests'
  | 'extra'
  | 'digital_skills'
  | 'custom_text'
  | 'custom_list';

export type CvSectionLayout =
  | 'full'
  | 'half'
  | 'sidebar'
  | 'main'
  | 'two_column'
  | 'grid_3';

export type CvLayoutSection = {
  id: string;
  type: CvSectionType;
  layout: CvSectionLayout;
  visible: boolean;
  title?: string;
  subsection?: string;
  children?: CvLayoutSection[];
  customKey?: string;
};

export type CvCustomSection = {
  type: 'text' | 'list';
  nl: string | CvListItem[];
  en?: string | CvListItem[];
};

export type CvDocumentPayload = {
  schemaVersion: 2;
  activeLocale: CvLocale;
  content: { nl: CvModel; en?: CvModel };
  layout: CvLayoutSection[];
  customSections?: Record<string, CvCustomSection>;
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
