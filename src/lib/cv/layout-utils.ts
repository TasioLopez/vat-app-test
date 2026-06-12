import type { CvLayoutSection, CvSectionLayout, CvSectionType } from '@/types/cv';
import { newCvId } from '@/types/cv';

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

export function addLayoutSection(
  layout: CvLayoutSection[],
  parentId: string | null,
  type: CvSectionType,
  sectionLayout: CvSectionLayout,
  opts?: { title?: string; customKey?: string }
): CvLayoutSection[] {
  const newSection: CvLayoutSection = {
    id: newCvId(),
    type,
    layout: sectionLayout,
    visible: true,
    ...(opts?.title ? { title: opts.title } : {}),
    ...(opts?.customKey ? { customKey: opts.customKey } : {}),
  };
  return updateChildren(layout, parentId, (children) => [...children, newSection]);
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

const CONTAINER_LAYOUTS = new Set(['two_column', 'sidebar', 'main', 'grid_3']);

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

/** Prefer main column (or root) when adding a new section from the structure panel. */
export function getDefaultAddParentId(layout: CvLayoutSection[]): string | null {
  for (const section of layout) {
    if (section.layout === 'two_column' && section.children?.length) {
      const main = section.children.find((c) => c.layout === 'main');
      if (main) return main.id;
    }
  }
  return null;
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
