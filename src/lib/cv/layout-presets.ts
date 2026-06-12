import type { CvLayoutSection, CvTemplateKey } from '@/types/cv';
import { newCvId } from '@/types/cv';

function section(
  type: CvLayoutSection['type'],
  layout: CvLayoutSection['layout'],
  opts?: Partial<Pick<CvLayoutSection, 'visible' | 'subsection' | 'customKey'>>
): CvLayoutSection {
  return {
    id: newCvId(),
    type,
    layout,
    visible: opts?.visible ?? true,
    ...(opts?.subsection ? { subsection: opts.subsection } : {}),
    ...(opts?.customKey ? { customKey: opts.customKey } : {}),
  };
}

function twoColumn(sidebar: CvLayoutSection[], main: CvLayoutSection[]): CvLayoutSection {
  return {
    id: newCvId(),
    type: 'profile',
    layout: 'two_column',
    visible: true,
    children: [
      {
        id: newCvId(),
        type: 'contact',
        layout: 'sidebar',
        visible: true,
        children: sidebar,
      },
      {
        id: newCvId(),
        type: 'profile',
        layout: 'main',
        visible: true,
        children: main,
      },
    ],
  };
}

function grid3(items: CvLayoutSection[]): CvLayoutSection {
  return {
    id: newCvId(),
    type: 'skills',
    layout: 'grid_3',
    visible: true,
    children: items,
  };
}

const MODERN_PROFESSIONAL: CvLayoutSection[] = [
  twoColumn(
    [
      section('photo', 'full'),
      section('contact', 'full'),
      section('skills', 'full'),
      section('languages', 'full'),
      section('interests', 'full'),
      section('digital_skills', 'full'),
    ],
    [
      section('personal_header', 'full'),
      section('profile', 'full'),
      section('experience', 'full'),
      section('education', 'full'),
      section('extra', 'full'),
    ]
  ),
];

const BALANCED_SPLIT: CvLayoutSection[] = [
  twoColumn(
    [
      section('personal_header', 'full'),
      section('profile', 'full'),
      section('experience', 'full'),
      section('education', 'full'),
    ],
    [
      section('photo', 'full'),
      section('contact', 'full'),
      section('skills', 'full'),
      section('languages', 'full'),
      section('interests', 'full'),
      section('digital_skills', 'full'),
      section('extra', 'full'),
    ]
  ),
];

const CORPORATE_MINIMAL: CvLayoutSection[] = [
  section('personal_header', 'full'),
  section('contact', 'full'),
  section('photo', 'full'),
  section('profile', 'full'),
  section('experience', 'full'),
  section('education', 'full'),
  grid3([
    section('skills', 'half'),
    section('languages', 'half'),
    section('interests', 'half'),
  ]),
  section('digital_skills', 'full'),
  section('extra', 'full'),
];

const CREATIVE_BOLD: CvLayoutSection[] = [
  section('personal_header', 'full'),
  section('photo', 'full'),
  twoColumn(
    [
      section('profile', 'full'),
      section('experience', 'full'),
      section('education', 'full'),
    ],
    [
      section('contact', 'full'),
      section('skills', 'full'),
      section('languages', 'full'),
      section('interests', 'full'),
      section('digital_skills', 'full'),
      section('extra', 'full'),
    ]
  ),
];

const LINEAR_TIMELINE: CvLayoutSection[] = [
  section('personal_header', 'full'),
  section('contact', 'full'),
  section('photo', 'full'),
  section('profile', 'full'),
  section('experience', 'full'),
  section('education', 'full'),
  grid3([
    section('skills', 'half'),
    section('languages', 'half'),
    section('interests', 'half'),
  ]),
  section('digital_skills', 'full'),
  section('extra', 'full'),
];

const PRESETS: Record<CvTemplateKey, CvLayoutSection[]> = {
  modern_professional: MODERN_PROFESSIONAL,
  creative_bold: CREATIVE_BOLD,
  corporate_minimal: CORPORATE_MINIMAL,
  linear_timeline: LINEAR_TIMELINE,
  balanced_split: BALANCED_SPLIT,
};

/** Deep-clone preset so each CV gets unique section ids. */
export function getDefaultLayout(templateKey: CvTemplateKey): CvLayoutSection[] {
  return JSON.parse(JSON.stringify(PRESETS[templateKey] ?? PRESETS.modern_professional)) as CvLayoutSection[];
}

function layoutFingerprint(layout: CvLayoutSection[]): string {
  const walk = (nodes: CvLayoutSection[]): string =>
    nodes
      .map((n) => `${n.type}:${n.layout}:${n.visible}${n.children ? `(${walk(n.children)})` : ''}`)
      .join('|');
  return walk(layout);
}

/** Apply template default layout; returns new layout (does not mutate). */
export function applyTemplateLayout(
  templateKey: CvTemplateKey,
  _currentLayout?: CvLayoutSection[]
): CvLayoutSection[] {
  return getDefaultLayout(templateKey);
}

/** True if layout differs from any template preset fingerprint. */
export function isLayoutCustomized(layout: CvLayoutSection[]): boolean {
  const fp = layoutFingerprint(layout);
  return !Object.values(PRESETS).some((preset) => layoutFingerprint(preset) === fp);
}
