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
import { listStructureSections } from '@/lib/cv/layout-utils';
import { ADDABLE_SECTION_TYPES, SECTION_REGISTRY } from '@/lib/cv/section-registry';
import { getSectionTitle, uiLabel } from '@/lib/cv/section-labels';
import type { CvSectionLayout, CvSectionType } from '@/types/cv';
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

function SortableRow({
  id,
  label,
  visible,
  onToggleVisible,
  onRemove,
  canRemove,
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggleVisible: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
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
        'flex items-center gap-1 rounded-md border bg-white px-2 py-1.5 text-sm',
        !visible && 'opacity-50'
      )}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={onToggleVisible}
        className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100"
        title={visible ? 'Verbergen' : 'Tonen'}
      >
        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
                label={getSectionTitle(section.type, activeLocale, section.title)}
                visible={section.visible}
                onToggleVisible={() =>
                  updateLayoutSection(section.id, { visible: !section.visible })
                }
                onRemove={() => removeLayoutSection(section.id)}
                canRemove={!SECTION_REGISTRY[section.type]?.singleton}
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
            <SelectItem value="full">{labels('layoutFull')}</SelectItem>
            <SelectItem value="half">{labels('layoutHalf')}</SelectItem>
            <SelectItem value="sidebar">{labels('layoutSidebar')}</SelectItem>
            <SelectItem value="main">{labels('layoutMain')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-1"
          onClick={() => addLayoutSection(newType, newLayout)}
        >
          <Plus className="h-3.5 w-3.5" />
          {labels('add')}
        </Button>
      </div>
    </aside>
  );
}
