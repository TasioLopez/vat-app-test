import type { CvChrome } from '@/lib/cv/theme-config';
import type { CvLayoutSection, CvModel, CvSectionType } from '@/types/cv';

export type CvAtomDescriptor =
  | { id: string; kind: 'section'; sectionId: string }
  | { id: string; kind: 'section_header'; sectionId: string }
  | { id: string; kind: 'experience_item'; sectionId: string; itemId: string }
  | { id: string; kind: 'education_item'; sectionId: string; itemId: string }
  | { id: string; kind: 'half_pair'; sectionIds: [string, string] }
  | { id: string; kind: 'grid3'; sectionId: string }
  | { id: string; kind: 'header_lockup'; sectionIds: string[] }
  | { id: string; kind: 'footer_strip'; sectionIds: string[] };

export type BuildColumnAtomsOptions = {
  chrome?: CvChrome;
};

const SPLIT_SECTION_TYPES = new Set(['experience', 'education']);
const LOCKUP_TYPES = new Set<CvSectionType>(['personal_header', 'contact', 'photo']);
const FOOTER_TYPES = new Set<CvSectionType>([
  'skills',
  'languages',
  'interests',
  'digital_skills',
  'extra',
]);

function splitTrailingFooter(sections: CvLayoutSection[]): {
  body: CvLayoutSection[];
  footer: CvLayoutSection[];
} {
  let end = sections.length;
  while (end > 0 && FOOTER_TYPES.has(sections[end - 1].type)) end -= 1;
  return {
    body: sections.slice(0, end),
    footer: sections.slice(end),
  };
}

/**
 * Group a leading name + contact + photo into one atom so the header cannot
 * split and the photo cannot land in a hole between sections.
 */
function takeLeadingLockup(
  sections: CvLayoutSection[],
  start: number
): { atom: CvAtomDescriptor; next: number } | null {
  let i = start;
  while (i < sections.length && !sections[i].visible) i += 1;
  if (i !== start) return null;
  const first = sections[i];
  if (!first || first.type !== 'personal_header' || !first.visible) return null;

  const ids = [first.id];
  i += 1;
  while (i < sections.length && LOCKUP_TYPES.has(sections[i].type) && sections[i].type !== 'personal_header') {
    if (sections[i].visible) ids.push(sections[i].id);
    i += 1;
  }
  if (ids.length < 2) return null;
  return {
    atom: { id: `lockup:${ids.join(':')}`, kind: 'header_lockup', sectionIds: ids },
    next: i,
  };
}

function sectionAtomId(sectionId: string): string {
  return `sec:${sectionId}`;
}

function headerAtomId(sectionId: string): string {
  return `hdr:${sectionId}`;
}

function itemAtomId(sectionId: string, itemId: string): string {
  return `item:${sectionId}:${itemId}`;
}

/**
 * Flatten a column's layout sections into measurable page atoms.
 * Experience/education split into header + per-entry atoms so entries can move across pages.
 */
export function buildColumnAtoms(
  sections: CvLayoutSection[],
  cvData: CvModel,
  options?: BuildColumnAtomsOptions
): CvAtomDescriptor[] {
  const chrome = options?.chrome;
  const useLockup = chrome === 'editorial' || chrome === 'timeline';
  const split = chrome === 'timeline' ? splitTrailingFooter(sections) : null;
  const working = split ? split.body : sections;
  const footerIds = (split?.footer ?? []).filter((s) => s.visible).map((s) => s.id);

  const atoms: CvAtomDescriptor[] = [];
  let i = 0;

  while (i < working.length) {
    if (useLockup && i === 0) {
      const lockup = takeLeadingLockup(working, i);
      if (lockup) {
        atoms.push(lockup.atom);
        i = lockup.next;
        continue;
      }
    }
    const section = working[i];
    if (!section.visible) {
      i += 1;
      continue;
    }

    if (section.layout === 'grid_3' && section.children?.length) {
      atoms.push({ id: `grid:${section.id}`, kind: 'grid3', sectionId: section.id });
      i += 1;
      continue;
    }

    if (section.layout === 'half') {
      const pair: CvLayoutSection[] = [section];
      if (i + 1 < working.length && working[i + 1].visible && working[i + 1].layout === 'half') {
        pair.push(working[i + 1]);
        i += 2;
      } else {
        i += 1;
      }
      if (pair.length === 2) {
        atoms.push({
          id: `half:${pair[0].id}:${pair[1].id}`,
          kind: 'half_pair',
          sectionIds: [pair[0].id, pair[1].id],
        });
      } else {
        pushSectionAtoms(atoms, pair[0], cvData);
      }
      continue;
    }

    pushSectionAtoms(atoms, section, cvData);
    i += 1;
  }

  if (footerIds.length) {
    atoms.push({ id: `footer:${footerIds.join(':')}`, kind: 'footer_strip', sectionIds: footerIds });
  }

  return atoms;
}

function pushSectionAtoms(
  atoms: CvAtomDescriptor[],
  section: CvLayoutSection,
  cvData: CvModel
): void {
  if (!SPLIT_SECTION_TYPES.has(section.type)) {
    atoms.push({ id: sectionAtomId(section.id), kind: 'section', sectionId: section.id });
    return;
  }

  atoms.push({ id: headerAtomId(section.id), kind: 'section_header', sectionId: section.id });

  if (section.type === 'experience') {
    for (const item of cvData.experience) {
      atoms.push({
        id: itemAtomId(section.id, item.id),
        kind: 'experience_item',
        sectionId: section.id,
        itemId: item.id,
      });
    }
    return;
  }

  if (section.type === 'education') {
    for (const item of cvData.education) {
      atoms.push({
        id: itemAtomId(section.id, item.id),
        kind: 'education_item',
        sectionId: section.id,
        itemId: item.id,
      });
    }
  }
}

export function findSectionById(
  sections: CvLayoutSection[],
  id: string
): CvLayoutSection | null {
  for (const s of sections) {
    if (s.id === id) return s;
    if (s.children?.length) {
      const found = findSectionById(s.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Extract two-column sidebar/main children from root layout, if present. */
export function findTwoColumnParts(layout: CvLayoutSection[]): {
  rootTwoColumn: CvLayoutSection | null;
  sidebar: CvLayoutSection | null;
  main: CvLayoutSection | null;
  before: CvLayoutSection[];
  after: CvLayoutSection[];
} {
  const before: CvLayoutSection[] = [];
  const after: CvLayoutSection[] = [];
  let rootTwoColumn: CvLayoutSection | null = null;
  let sidebar: CvLayoutSection | null = null;
  let main: CvLayoutSection | null = null;
  let seen = false;

  for (const section of layout) {
    if (!seen && section.layout === 'two_column' && section.children?.length) {
      rootTwoColumn = section;
      sidebar = section.children.find((c) => c.layout === 'sidebar') ?? null;
      main = section.children.find((c) => c.layout === 'main') ?? null;
      seen = true;
      continue;
    }
    if (!seen) before.push(section);
    else after.push(section);
  }

  return { rootTwoColumn, sidebar, main, before, after };
}
