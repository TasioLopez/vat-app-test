/** Validates a full replacement snapshot of kb_categories parent/sort fields. */

export type ReorderItem = { id: string; parentId: string | null; sortOrder: number };

export function validateCategoryReorder(
  items: ReorderItem[],
  existingIds: Set<string>
): { ok: true } | { ok: false; error: string } {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) return { ok: false, error: "Dubbele id in aanvraag" };
    seen.add(it.id);
  }

  if (items.length !== existingIds.size) {
    return { ok: false, error: "Aantal categorieën komt niet overeen met de database" };
  }

  for (const it of items) {
    if (!existingIds.has(it.id)) return { ok: false, error: "Onbekende categorie-id" };
    if (it.parentId !== null && !existingIds.has(it.parentId)) {
      return { ok: false, error: "Ongeldige ouder" };
    }
  }

  const children = new Map<string | null, string[]>();
  for (const it of items) {
    const p = it.parentId;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(it.id);
  }

  function descendantsOf(n: string): Set<string> {
    const out = new Set<string>();
    const stack = [...(children.get(n) || [])];
    while (stack.length) {
      const x = stack.pop()!;
      if (out.has(x)) continue;
      out.add(x);
      for (const c of children.get(x) || []) stack.push(c);
    }
    return out;
  }

  for (const it of items) {
    const p = it.parentId;
    if (p !== null && p === it.id) {
      return { ok: false, error: "Categorie kan niet eigen ouder zijn" };
    }
    if (p !== null) {
      const desc = descendantsOf(it.id);
      if (desc.has(p)) {
        return { ok: false, error: "Categorie kan niet onder een subcategorie van zichzelf hangen" };
      }
    }
  }

  return { ok: true };
}
