'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CvAddSectionControl from '@/components/cv/CvAddSectionControl';
import CvEditableSectionWrap from '@/components/cv/CvEditableSectionWrap';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

type ColumnHint = 'sidebar' | 'main' | 'root';
type Variant = 'default' | 'sidebar';

type Props = {
  sections: CvLayoutSection[];
  parentId: string | null;
  columnHint: ColumnHint;
  accent: string;
  variant: Variant;
  isFirstColumnSection?: boolean;
  showAddControl?: boolean;
  renderTwoColumn?: (section: CvLayoutSection) => React.ReactNode;
};

export default function CvEditableColumnFlow({
  sections,
  parentId,
  columnHint,
  accent,
  variant,
  isFirstColumnSection = false,
  showAddControl = true,
  renderTwoColumn,
}: Props) {
  const { reorderSectionsById } = useCV();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const sortableIds = sections.map((s) => s.id);

  const nodes: React.ReactNode[] = [];
  let i = 0;
  let firstRendered = true;

  while (i < sections.length) {
    const section = sections[i];

    if (section.layout === 'two_column' && renderTwoColumn) {
      nodes.push(<div key={section.id}>{renderTwoColumn(section)}</div>);
      i += 1;
      continue;
    }

    if (section.layout === 'grid_3' && section.children?.length) {
      nodes.push(
        <SortableContainerShell key={section.id} section={section}>
          <Grid3EditableBlock
            section={section}
            accent={accent}
            onReorder={reorderSectionsById}
          />
        </SortableContainerShell>
      );
      i += 1;
      continue;
    }

    const extraClass =
      isFirstColumnSection && firstRendered && variant === 'sidebar' ? 'pt-1' : undefined;
    firstRendered = false;

    if (section.layout === 'half') {
      const pair: CvLayoutSection[] = [section];
      if (i + 1 < sections.length && sections[i + 1].layout === 'half') {
        pair.push(sections[i + 1]);
        i += 2;
      } else {
        i += 1;
      }
      nodes.push(
        <div key={pair.map((p) => p.id).join('-')} className="flex w-full flex-wrap -mx-1">
          {pair.map((s) => (
            <CvEditableSectionWrap
              key={s.id}
              section={s}
              accent={accent}
              variant={variant}
              className={extraClass}
            />
          ))}
        </div>
      );
      continue;
    }

    nodes.push(
      <CvEditableSectionWrap
        key={section.id}
        section={section}
        accent={accent}
        variant={variant}
        className={extraClass}
      />
    );
    i += 1;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        reorderSectionsById(String(active.id), String(over.id));
      }}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">{nodes}</div>
      </SortableContext>
      {showAddControl ? (
        <CvAddSectionControl
          parentId={parentId}
          columnHint={columnHint}
          variant={variant}
        />
      ) : null}
    </DndContext>
  );
}

function SortableContainerShell({
  section,
  children,
}: {
  section: CvLayoutSection;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/container relative w-full">
      <div
        className={cn(
          'cv-no-print absolute -top-2 left-0 z-20',
          'opacity-0 transition-opacity group-hover/container:opacity-100'
        )}
      >
        <button
          type="button"
          className="cursor-grab rounded border border-gray-200 bg-white p-0.5 text-gray-400 shadow-sm hover:text-gray-600"
          aria-label="Sleep om te verplaatsen"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function Grid3EditableBlock({
  section,
  accent,
  onReorder,
}: {
  section: CvLayoutSection;
  accent: string;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const children = section.children ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = children.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        onReorder(String(active.id), String(over.id));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {children.map((child) => (
            <CvEditableSectionWrap
              key={child.id}
              section={child}
              accent={accent}
              variant="default"
            />
          ))}
        </div>
      </SortableContext>
      <CvAddSectionControl parentId={section.id} columnHint="root" variant="default" />
    </DndContext>
  );
}
