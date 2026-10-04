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

/** Persisted per-field text style (hex color). */
export type CvFieldStyle = {
  color?: string;
};

export type CvExperienceFieldKey = 'role' | 'organization' | 'period' | 'description';
export type CvEducationFieldKey = 'institution' | 'diploma' | 'period' | 'description';
export type CvLanguageFieldKey = 'language' | 'level';
export type CvListFieldKey = 'text';

export type CvExperienceItem = {
  id: string;
  role: string;
  organization?: string;
  period?: string;
  description?: string;
  styles?: Partial<Record<CvExperienceFieldKey, CvFieldStyle>>;
};

export type CvEducationItem = {
  id: string;
  institution: string;
  diploma?: string;
  period?: string;
  description?: string;
  styles?: Partial<Record<CvEducationFieldKey, CvFieldStyle>>;
};

export type CvListItem = {
  id: string;
  text: string;
  styles?: Partial<Record<CvListFieldKey, CvFieldStyle>>;
};

export type CvLanguageItem = {
  id: string;
  language: string;
  level?: string;
  styles?: Partial<Record<CvLanguageFieldKey, CvFieldStyle>>;
};

/** Currently selected editable field in the CV editor toolbar. */
export type CvFieldSelection =
  | { itemType: 'experience'; itemId: string; field: CvExperienceFieldKey }
  | { itemType: 'education'; itemId: string; field: CvEducationFieldKey }
  | { itemType: 'language'; itemId: string; field: CvLanguageFieldKey }
  | { itemType: 'skill'; itemId: string; field: CvListFieldKey }
  | { itemType: 'interest'; itemId: string; field: CvListFieldKey };

export function isOptionalCvField(selection: CvFieldSelection): boolean {
  if (selection.itemType === 'experience') {
    return (
      selection.field === 'organization' ||
      selection.field === 'period' ||
      selection.field === 'description'
    );
  }
  if (selection.itemType === 'education') {
    return (
      selection.field === 'diploma' ||
      selection.field === 'period' ||
      selection.field === 'description'
    );
  }
  if (selection.itemType === 'language') {
    return selection.field === 'level';
  }
  return false;
}

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
  /** Square frame edge length in px (editor / print / PDF) */
  photoSizePx?: number;
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

export type CvSidebarPosition = 'left' | 'right';

export type CvLayoutOptions = {
  sidebarPosition?: CvSidebarPosition;
  /** Curated font id from CV_FONT_OPTIONS (e.g. montserrat, georgia) */
  fontFamily?: string;
};

export type CvDocumentPayload = {
  schemaVersion: 2;
  activeLocale: CvLocale;
  content: { nl: CvModel; en?: CvModel };
  layout: CvLayoutSection[];
  customSections?: Record<string, CvCustomSection>;
  layoutOptions?: CvLayoutOptions;
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
