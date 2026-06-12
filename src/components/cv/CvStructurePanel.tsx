'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import { sectionLayoutBadge } from '@/lib/cv/layout-classes';
import { canAddSection, listStructureSections } from '@/lib/cv/layout-utils';
import { ADDABLE_SECTION_TYPES, SECTION_REGISTRY } from '@/lib/cv/section-registry';
import { getSectionTitle, uiLabel } from '@/lib/cv/section-labels';
import type { CvLayoutSection, CvSectionLayout, CvSectionType } from '@/types/cv';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const ADD_LAYOUT_OPTIONS: CvSectionLayout[] = ['full', 'half', 'sidebar', 'main'];
const ROW_LAYOUT_OPTIONS: CvSectionLayout[] = ['full', 'half'];

function layoutOptionLabel(layout: CvSectionLayout, labels: (k: string) => string): string {
  switch (layout) {
    case 'full':
      return labels('layoutFull');
    case 'half':
      return labels('layoutHalf');
    case 'sidebar':
      return labels('layoutSidebar');
    case 'main':
      return labels('layoutMain');
    default:
      return layout;
  }
}

function SortableRow({
  id,
  section,
  label,
  visible,
  activeLocale,
  onToggleVisible,
  onRemove,
  onLayoutChange,
}: {
  id: string;
  section: CvLayoutSection;
  label: string;
  visible: boolean;
  activeLocale: 'nl' | 'en';
  onToggleVisible: () => void;
  onRemove: () => void;
  onLayoutChange: (layout: CvSectionLayout) => void;
}) {
  const labels = (key: string) => uiLabel(activeLocale, key);
  const allowed = SECTION_REGISTRY[section.type]?.allowedLayouts ?? ['full'];
  const layoutChoices = ROW_LAYOUT_OPTIONS.filter((l) => allowed.includes(l));

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-1 rounded-md border bg-white px-2 py-1.5 text-sm',
        !visible && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className="shrink-0 rounded bg-gray-100 px-1 text-[10px] font-medium text-gray-600"
          title={layoutOptionLabel(section.layout, labels)}
        >
          {sectionLayoutBadge(section.layout)}
        </span>
        <button
          type="button"
          onClick={onToggleVisible}
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100"
          title={visible ? labels('hidden') : labels('show')}
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title={labels('removeSection')}
          aria-label={labels('removeSection')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {layoutChoices.length > 1 && (
        <Select
          value={section.layout}
          onValueChange={(v) => onLayoutChange(v as CvSectionLayout)}
        >
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {layoutChoices.map((l) => (
              <SelectItem key={l} value={l} className="text-xs">
                {layoutOptionLabel(l, labels)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default function CvStructurePanel() {
  const {
    layout,
    activeLocale,
    reorderSectionsById,
    addLayoutSection,
    removeLayoutSection,
    updateLayoutSection,
  } = useCV();

  const [newType, setNewType] = useState<CvSectionType>('profile');
  const [newLayout, setNewLayout] = useState<CvSectionLayout>('full');

  const sections = useMemo(() => listStructureSections(layout), [layout]);
  const labels = (key: string) => uiLabel(activeLocale, key);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rootIds = sections.map((s) => s.id);

  const handleRemove = (section: CvLayoutSection) => {
    const title = getSectionTitle(section.type, activeLocale, section.title);
    const msg = labels('removeSectionConfirm').replace('{title}', title);
    if (window.confirm(msg)) {
      removeLayoutSection(section.id);
    }
  };

  const handleAdd = () => {
    if (!canAddSection(layout, newType)) {
      window.alert(labels('duplicateSection'));
      return;
    }
    const ok = addLayoutSection(newType, newLayout);
    if (!ok) {
      window.alert(labels('duplicateSection'));
    }
  };

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-3 border-r bg-gray-50 p-3 print:hidden">
      <h2 className="text-sm font-semibold text-gray-800">{labels('structure')}</h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (!over || active.id === over.id) return;
          const from = rootIds.indexOf(String(active.id));
          const to = rootIds.indexOf(String(over.id));
          if (from >= 0 && to >= 0) reorderSectionsById(String(active.id), String(over.id));
        }}
      >
        <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
          <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {sections.map((section) => (
              <SortableRow
                key={section.id}
                id={section.id}
                section={section}
                label={getSectionTitle(section.type, activeLocale, section.title)}
                visible={section.visible}
                activeLocale={activeLocale}
                onToggleVisible={() =>
                  updateLayoutSection(section.id, { visible: !section.visible })
                }
                onRemove={() => handleRemove(section)}
                onLayoutChange={(l) => updateLayoutSection(section.id, { layout: l })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-gray-600">{labels('addSection')}</p>
        <Select value={newType} onValueChange={(v) => setNewType(v as CvSectionType)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADDABLE_SECTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {getSectionTitle(t, activeLocale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newLayout} onValueChange={(v) => setNewLayout(v as CvSectionLayout)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADD_LAYOUT_OPTIONS.map((l) => (
              <SelectItem key={l} value={l}>
                {layoutOptionLabel(l, labels)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          {labels('add')}
        </Button>
      </div>
    </aside>
  );
}
