/** Client-side kb category tree mutations (parent_id + sort_order). */

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  tool_key: string | null;
};

function reindexGroup(
  cats: CategoryRow[],
  parentId: string | null,
  excludeId?: string
): void {
  const group = cats
    .filter((c) => c.parent_id === parentId && c.id !== excludeId)
    .sort((a, b) => a.sort_order - b.sort_order);
  group.forEach((c, i) => {
    const row = cats.find((x) => x.id === c.id);
    if (row) row.sort_order = i;
  });
}

/** Move active directly before `over` (same parent as over after move). */
export function moveCategoryBefore(cats: CategoryRow[], activeId: string, overId: string): CategoryRow[] {
  const copy = cats.map((c) => ({ ...c }));
  const active = copy.find((c) => c.id === activeId);
  const over = copy.find((c) => c.id === overId);
  if (!active || !over || activeId === overId) return copy;

  const oldParent = active.parent_id;
  const newParent = over.parent_id;
  active.parent_id = newParent;

  const others = copy
    .filter((c) => c.parent_id === newParent && c.id !== activeId)
    .sort((a, b) => a.sort_order - b.sort_order);
  const insertAt = others.findIndex((c) => c.id === overId);
  const ordered =
    insertAt === -1
      ? [...others, active]
      : [...others.slice(0, insertAt), active, ...others.slice(insertAt)];
  ordered.forEach((c, i) => {
    const row = copy.find((x) => x.id === c.id);
    if (row) row.sort_order = i;
  });

  if (oldParent !== newParent) {
    reindexGroup(copy, oldParent);
  }

  return copy;
}

/** Append active as last child of parentId (root if null). */
export function appendCategoryToParent(
  cats: CategoryRow[],
  activeId: string,
  parentId: string | null
): CategoryRow[] {
  const copy = cats.map((c) => ({ ...c }));
  const active = copy.find((c) => c.id === activeId);
  if (!active) return copy;

  const oldParent = active.parent_id;
  active.parent_id = parentId;

  const others = copy
    .filter((c) => c.parent_id === parentId && c.id !== activeId)
    .sort((a, b) => a.sort_order - b.sort_order);
  const ordered = [...others, active];
  ordered.forEach((c, i) => {
    const row = copy.find((x) => x.id === c.id);
    if (row) row.sort_order = i;
  });

  if (oldParent !== parentId) {
    reindexGroup(copy, oldParent);
  }

  return copy;
}

export function getDescendantIds(
  cats: Pick<CategoryRow, "id" | "parent_id">[],
  rootId: string
): Set<string> {
  const children = new Map<string, string[]>();
  for (const c of cats) {
    const p = c.parent_id;
    if (p === null) continue;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(c.id);
  }
  const out = new Set<string>();
  const stack = [...(children.get(rootId) || [])];
  while (stack.length) {
    const x = stack.pop()!;
    if (out.has(x)) continue;
    out.add(x);
    for (const ch of children.get(x) || []) stack.push(ch);
  }
  return out;
}
