"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToastHelpers } from "@/components/ui/Toast";
import { validateCategoryReorder } from "@/lib/help/category-reorder";
import {
  appendCategoryToParent,
  getDescendantIds,
  moveCategoryBefore,
  type CategoryRow,
} from "@/lib/help/category-tree-client";

const EMPTY_PREFIX = "empty-drop-";

function emptyDropId(parentId: string | null) {
  return `${EMPTY_PREFIX}${parentId ?? "root"}`;
}

function parseEmptyDropId(id: string): string | null | undefined {
  if (!id.startsWith(EMPTY_PREFIX)) return undefined;
  const rest = id.slice(EMPTY_PREFIX.length);
  if (rest === "root") return null;
  return rest;
}

function DroppableEmpty({ parentId }: { parentId: string | null }) {
  const id = emptyDropId(parentId);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] rounded-lg border-2 border-dashed px-3 py-2 text-sm transition-colors cursor-pointer ${
        isOver ? "border-purple-500 bg-purple-50 text-purple-800" : "border-purple-100 text-gray-400"
      }`}
    >
      Sleep hier naartoe om als laatste onder dit niveau te plaatsen
    </div>
  );
}

function SortableCategoryRow({
  cat,
  depth,
  onEdit,
  onDelete,
}: {
  cat: CategoryRow;
  depth: number;
  onEdit: (c: CategoryRow) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch gap-2 rounded-lg border border-purple-100 bg-white pl-2 pr-3 py-2 shadow-sm ${
        depth > 0 ? "ml-4 border-l-2 border-l-purple-200" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-purple-400 hover:text-purple-600 px-1 flex-shrink-0"
        aria-label="Verslepen"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900">{cat.title}</div>
        <div className="text-sm text-gray-500">{cat.slug}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => onEdit(cat)}
        >
          Bewerken
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer text-red-700 border-red-200 hover:bg-red-50"
          onClick={() => onDelete(cat.id)}
        >
          Verwijderen
        </Button>
      </div>
    </div>
  );
}

function CategoryLevel({
  parentId,
  depth,
  categories,
  onEdit,
  onDelete,
  renderNested,
}: {
  parentId: string | null;
  depth: number;
  categories: CategoryRow[];
  onEdit: (c: CategoryRow) => void;
  onDelete: (id: string) => void;
  renderNested: (parentKey: string | null, d: number) => ReactNode;
}) {
  const siblings = useMemo(
    () =>
      categories
        .filter((c) => c.parent_id === parentId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories, parentId]
  );
  const ids = siblings.map((c) => c.id);

  if (siblings.length === 0) {
    if (parentId === null) return null;
    return <DroppableEmpty parentId={parentId} />;
  }

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul className={`space-y-2 ${depth > 0 ? "mt-2" : ""}`}>
        {siblings.map((cat) => (
          <li key={cat.id} className="space-y-2">
            <SortableCategoryRow cat={cat} depth={depth} onEdit={onEdit} onDelete={onDelete} />
            <div className={depth >= 0 ? "pl-2" : ""}>{renderNested(cat.id, depth + 1)}</div>
          </li>
        ))}
        <li>
          <DroppableEmpty parentId={parentId} />
        </li>
      </ul>
    </SortableContext>
  );
}

export default function AdminCategoriesPage() {
  const { showSuccess, showError } = useToastHelpers();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");
  const [editToolKey, setEditToolKey] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/help/admin/categories");
    const j = await res.json();
    if (!res.ok) {
      showError("Laden mislukt", j.error);
      return;
    }
    setCategories(j.categories || []);
  }, [showError]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const existingIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  const persistOrder = useCallback(
    async (next: CategoryRow[]) => {
      const items = next.map((c) => ({
        id: c.id,
        parentId: c.parent_id,
        sortOrder: c.sort_order,
      }));
      const v = validateCategoryReorder(items, existingIds);
      if (!v.ok) {
        showError("Ongeldige structuur", v.error);
        await load();
        return;
      }
      setSavingOrder(true);
      try {
        const res = await fetch("/api/help/admin/categories/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          showError("Volgorde opslaan mislukt", j.error || res.statusText);
          await load();
          return;
        }
        showSuccess("Volgorde bijgewerkt");
      } finally {
        setSavingOrder(false);
      }
    },
    [existingIds, load, showError, showSuccess]
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (aid === oid) return;

    let next: CategoryRow[];
    const parsed = parseEmptyDropId(oid);
    if (parsed !== undefined) {
      next = appendCategoryToParent(categories, aid, parsed);
    } else {
      next = moveCategoryBefore(categories, aid, oid);
    }
    setCategories(next);
    await persistOrder(next);
  };

  const create = async () => {
    const res = await fetch("/api/help/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title,
        description: description || null,
        parentId: parentId || null,
        sortOrder,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setSlug("");
      setTitle("");
      setDescription("");
      showSuccess("Categorie aangemaakt");
      await load();
    } else {
      showError("Aanmaken mislukt", j.error || "");
    }
  };

  const openEdit = (c: CategoryRow) => {
    setEditing(c);
    setEditSlug(c.slug);
    setEditTitle(c.title);
    setEditDescription(c.description || "");
    setEditParentId(c.parent_id || "");
    setEditToolKey(c.tool_key || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const res = await fetch(`/api/help/admin/categories/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: editSlug,
        title: editTitle,
        description: editDescription || null,
        parentId: editParentId || null,
        toolKey: editToolKey || null,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      showSuccess("Opgeslagen");
      setEditOpen(false);
      setEditing(null);
      await load();
    } else {
      showError("Opslaan mislukt", j.error || "");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/help/admin/categories/${deleteId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        showSuccess("Categorie verwijderd");
        setDeleteId(null);
        await load();
      } else {
        showError("Verwijderen mislukt", j.error || "");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const parentOptionsForEdit = useMemo(() => {
    if (!editing) return [];
    const banned = new Set([editing.id, ...getDescendantIds(categories, editing.id)]);
    return categories.filter((c) => !banned.has(c.id));
  }, [categories, editing]);

  const activeCategory = activeId ? categories.find((c) => c.id === activeId) : null;

  const renderNested = (parentKey: string | null, d: number) => (
    <CategoryLevel
      parentId={parentKey}
      depth={d}
      categories={categories}
      onEdit={openEdit}
      onDelete={(id) => setDeleteId(id)}
      renderNested={renderNested}
    />
  );

  if (loading) {
    return <div className="p-8 text-gray-500">Laden…</div>;
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Kenniscategorieën</h1>
      <p className="text-sm text-gray-600">
        De volgorde en hiërarchie hieronder komen overeen met het Kenniscentrum voor gebruikers.
      </p>

      <div className="bg-white rounded-xl border border-purple-100 p-6 space-y-4">
        <h2 className="font-semibold">Nieuwe categorie</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            className="cursor-text"
            placeholder="slug (bijv. mijn-sectie)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Input
            className="cursor-text"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 border-input cursor-pointer"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Geen ouder (hoofdniveau)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <Input
            type="number"
            className="cursor-text"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
          <div className="sm:col-span-2">
            <Textarea
              className="cursor-text min-h-[72px]"
              placeholder="Beschrijving (optioneel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" className="cursor-pointer" onClick={create} disabled={!slug.trim() || !title.trim()}>
          Aanmaken
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Structuur</h2>
        {savingOrder ? <p className="text-sm text-gray-500">Volgorde opslaan…</p> : null}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {categories.filter((c) => !c.parent_id).length === 0 ? (
            <DroppableEmpty parentId={null} />
          ) : (
            renderNested(null, 0)
          )}
          <DragOverlay dropAnimation={null}>
            {activeCategory ? (
              <div className="rounded-lg border border-purple-200 bg-white p-3 shadow-lg opacity-95">
                <div className="font-medium">{activeCategory.title}</div>
                <div className="text-sm text-gray-500">{activeCategory.slug}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Categorie bewerken</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                className="cursor-text mt-1"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-title">Titel</Label>
              <Input
                id="edit-title"
                className="cursor-text mt-1"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Beschrijving</Label>
              <Textarea
                id="edit-desc"
                className="cursor-text mt-1 min-h-[80px]"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-parent">Ouder</Label>
              <select
                id="edit-parent"
                className="mt-1 w-full border rounded-lg px-3 py-2 cursor-pointer"
                value={editParentId}
                onChange={(e) => setEditParentId(e.target.value)}
              >
                <option value="">Geen ouder (hoofdniveau)</option>
                {parentOptionsForEdit.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-tool">Tool key (optioneel)</Label>
              <Input
                id="edit-tool"
                className="cursor-text mt-1"
                value={editToolKey}
                onChange={(e) => setEditToolKey(e.target.value)}
                placeholder="bijv. trajectplan_builder"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setEditOpen(false)}>
              Annuleren
            </Button>
            <Button type="button" className="cursor-pointer" onClick={saveEdit}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Categorie verwijderen?"
        description="Verplaats eerst gekoppelde artikelen naar een andere categorie. Deze actie kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
