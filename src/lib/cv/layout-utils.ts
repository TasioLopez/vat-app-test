import { SECTION_REGISTRY } from '@/lib/cv/section-registry';
import type { CvLayoutSection, CvSectionLayout, CvSectionType } from '@/types/cv';
import { newCvId } from '@/types/cv';

const CONTAINER_LAYOUTS = new Set<CvSectionLayout>(['two_column', 'sidebar', 'main', 'grid_3']);

export function cloneLayout(layout: CvLayoutSection[]): CvLayoutSection[] {
  return JSON.parse(JSON.stringify(layout)) as CvLayoutSection[];
}

export function findSectionPath(
  layout: CvLayoutSection[],
  sectionId: string,
  parentId: string | null = null
): { parentId: string | null; index: number; section: CvLayoutSection } | null {
  for (let i = 0; i < layout.length; i++) {
    const section = layout[i];
    if (section.id === sectionId) {
      return { parentId, index: i, section };
    }
    if (section.children?.length) {
      const found = findSectionPath(section.children, sectionId, section.id);
      if (found) return found;
    }
  }
  return null;
}

function updateChildren(
  layout: CvLayoutSection[],
  parentId: string | null,
  updater: (children: CvLayoutSection[]) => CvLayoutSection[]
): CvLayoutSection[] {
  if (parentId === null) {
    return updater(layout);
  }
  return layout.map((s) => {
    if (s.id === parentId) {
      return { ...s, children: updater(s.children ?? []) };
    }
    if (s.children?.length) {
      return { ...s, children: updateChildren(s.children, parentId, updater) };
    }
    return s;
  });
}

export function reorderLayoutSections(
  layout: CvLayoutSection[],
  parentId: string | null,
  fromIndex: number,
  toIndex: number
): CvLayoutSection[] {
  return updateChildren(layout, parentId, (children) => {
    const next = [...children];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    return next;
  });
}

export function updateLayoutSection(
  layout: CvLayoutSection[],
  sectionId: string,
  patch: Partial<CvLayoutSection>
): CvLayoutSection[] {
  const walk = (nodes: CvLayoutSection[]): CvLayoutSection[] =>
    nodes.map((s) => {
      if (s.id === sectionId) {
        return { ...s, ...patch, id: s.id };
      }
      if (s.children?.length) {
        return { ...s, children: walk(s.children) };
      }
      return s;
    });
  return walk(layout);
}

export function removeLayoutSection(layout: CvLayoutSection[], sectionId: string): CvLayoutSection[] {
  const walk = (nodes: CvLayoutSection[]): CvLayoutSection[] =>
    nodes
      .filter((s) => s.id !== sectionId)
      .map((s) => (s.children?.length ? { ...s, children: walk(s.children) } : s));
  return walk(layout);
}

export function findSectionByType(
  layout: CvLayoutSection[],
  type: CvSectionType
): CvLayoutSection | null {
  for (const section of layout) {
    if (!CONTAINER_LAYOUTS.has(section.layout) && section.type === type) {
      return section;
    }
    if (section.children?.length) {
      const found = findSectionByType(section.children, type);
      if (found) return found;
    }
  }
  return null;
}

export type AddLayoutSectionResult =
  | { ok: true; layout: CvLayoutSection[] }
  | { ok: false; reason: 'duplicate_singleton' };

export function canAddSection(layout: CvLayoutSection[], type: CvSectionType): boolean {
  const entry = SECTION_REGISTRY[type];
  if (!entry?.singleton) return true;
  const existing = findSectionByType(layout, type);
  if (!existing) return true;
  return !existing.visible;
}

export function addLayoutSection(
  layout: CvLayoutSection[],
  parentId: string | null,
  type: CvSectionType,
  sectionLayout: CvSectionLayout,
  opts?: { title?: string; customKey?: string }
): AddLayoutSectionResult {
  const entry = SECTION_REGISTRY[type];
  if (entry?.singleton) {
    const existing = findSectionByType(layout, type);
    if (existing) {
      if (!existing.visible) {
        return {
          ok: true,
          layout: updateLayoutSection(layout, existing.id, { visible: true }),
        };
      }
      return { ok: false, reason: 'duplicate_singleton' };
    }
  }

  const newSection: CvLayoutSection = {
    id: newCvId(),
    type,
    layout: sectionLayout,
    visible: true,
    ...(opts?.title ? { title: opts.title } : {}),
    ...(opts?.customKey ? { customKey: opts.customKey } : {}),
  };
  return {
    ok: true,
    layout: updateChildren(layout, parentId, (children) => [...children, newSection]),
  };
}

export function flattenVisibleSections(layout: CvLayoutSection[]): CvLayoutSection[] {
  const result: CvLayoutSection[] = [];
  const walk = (nodes: CvLayoutSection[]) => {
    for (const n of nodes) {
      if (n.layout === 'two_column' || n.layout === 'grid_3') {
        if (n.children?.length) walk(n.children);
        continue;
      }
      if (n.layout === 'sidebar' || n.layout === 'main') {
        if (n.children?.length) walk(n.children);
        continue;
      }
      if (n.visible) result.push(n);
      if (n.children?.length && n.type !== 'profile') {
        walk(n.children);
      }
    }
  };
  walk(layout);
  return result;
}

export function listStructureSections(layout: CvLayoutSection[]): CvLayoutSection[] {
  const result: CvLayoutSection[] = [];
  const walk = (nodes: CvLayoutSection[]) => {
    for (const n of nodes) {
      if (CONTAINER_LAYOUTS.has(n.layout) && n.children?.length) {
        walk(n.children);
        continue;
      }
      result.push(n);
    }
  };
  walk(layout);
  return result;
}

function findTwoColumnColumns(layout: CvLayoutSection[]): {
  sidebarId: string | null;
  mainId: string | null;
} {
  for (const section of layout) {
    if (section.layout === 'two_column' && section.children?.length) {
      const sidebar = section.children.find((c) => c.layout === 'sidebar');
      const main = section.children.find((c) => c.layout === 'main');
      return {
        sidebarId: sidebar?.id ?? null,
        mainId: main?.id ?? null,
      };
    }
  }
  return { sidebarId: null, mainId: null };
}

/** Route new sections to sidebar or main column based on chosen layout. */
export function resolveAddParentId(
  layout: CvLayoutSection[],
  sectionLayout: CvSectionLayout
): string | null {
  const { sidebarId, mainId } = findTwoColumnColumns(layout);
  if (!sidebarId && !mainId) return null;

  if (sectionLayout === 'sidebar') {
    return sidebarId;
  }
  if (sectionLayout === 'main' || sectionLayout === 'full' || sectionLayout === 'half') {
    return mainId;
  }
  return mainId;
}

/** @deprecated Use resolveAddParentId */
export function getDefaultAddParentId(layout: CvLayoutSection[]): string | null {
  return resolveAddParentId(layout, 'full');
}

export function reorderSectionsById(
  layout: CvLayoutSection[],
  activeId: string,
  overId: string
): CvLayoutSection[] {
  const activePath = findSectionPath(layout, activeId);
  const overPath = findSectionPath(layout, overId);
  if (!activePath || !overPath) return layout;
  if (activePath.parentId !== overPath.parentId) return layout;
  return reorderLayoutSections(
    layout,
    activePath.parentId,
    activePath.index,
    overPath.index
  );
}
