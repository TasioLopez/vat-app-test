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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CvEditableColumnFlow from '@/components/cv/CvEditableColumnFlow';
import { sidebarPositionFromColumnOrder } from '@/lib/cv/layout-editor-utils';
import { getCvTheme } from '@/lib/cv/theme-config';
import { uiLabel } from '@/lib/cv/section-labels';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

type Props = {
  section: CvLayoutSection;
  accent: string;
  showPhoto: boolean;
};

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SortableColumnShell({
  id,
  label,
  gripSide,
  variant,
  children,
}: {
  id: string;
  label: string;
  gripSide: 'left' | 'right';
  variant: 'sidebar' | 'main';
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const { activeLocale } = useCV();
  const dragLabel = uiLabel(activeLocale, 'dragColumnToSwap');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/column relative min-h-full self-stretch',
        variant === 'main' ? 'min-w-0 flex-1' : 'shrink-0'
      )}
    >
      <div
        className={cn(
          'cv-no-print pointer-events-none absolute inset-0 z-10 rounded-sm border-2 border-transparent transition-colors',
          'group-hover/column:border-sky-400/70'
        )}
        aria-hidden
      />
      <div
        className={cn(
          'cv-no-print absolute top-1 z-20 opacity-0 transition-opacity group-hover/column:opacity-100',
          gripSide === 'left' ? 'left-1' : 'right-1'
        )}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
          <button
            type="button"
            className="cursor-grab rounded p-0.5 text-gray-400 hover:text-gray-600"
            aria-label={dragLabel}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="max-w-[5rem] truncate text-[10px] font-medium text-gray-600">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function CvTwoColumnEditable({ section, accent, showPhoto }: Props) {
  const { templateKey, layoutOptions, setSidebarPosition, activeLocale } = useCV();
  const theme = getCvTheme(templateKey);
  const sidebarPosition = layoutOptions.sidebarPosition ?? 'left';

  const sidebar = section.children?.find((c) => c.layout === 'sidebar');
  const main = section.children?.find((c) => c.layout === 'main');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (!sidebar || !main) return null;

  const sidebarHasPhotoFirst = () => {
    const photo = sidebar.children?.find((c) => c.type === 'photo');
    return Boolean(photo?.visible && showPhoto);
  };

  const columnIds = [sidebar.id, main.id];
  const labels = (key: string) => uiLabel(activeLocale, key);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const from = columnIds.indexOf(String(active.id));
        const to = columnIds.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        const newOrder = arrayMove(columnIds, from, to);
        setSidebarPosition(sidebarPositionFromColumnOrder(newOrder, sidebar.id, main.id));
      }}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div
          className={cn(
            'flex min-h-[297mm] w-full flex-1 items-stretch',
            sidebarPosition === 'right' && 'flex-row-reverse'
          )}
        >
          <SortableColumnShell
            id={sidebar.id}
            label={labels('columnSidebar')}
            gripSide="left"
            variant="sidebar"
          >
            <aside
              className={cn(theme.sidebarClass, 'min-h-full h-full self-stretch')}
              style={{ backgroundColor: accent }}
            >
              <CvEditableColumnFlow
                sections={sidebar.children ?? []}
                parentId={sidebar.id}
                columnHint="sidebar"
                accent={accent}
                variant="sidebar"
                isFirstColumnSection={!sidebarHasPhotoFirst()}
              />
            </aside>
          </SortableColumnShell>

          <SortableColumnShell
            id={main.id}
            label={labels('columnMain')}
            gripSide="right"
            variant="main"
          >
            <div className={cn(theme.mainClass, 'min-h-full h-full flex-1')}>
              <CvEditableColumnFlow
                sections={main.children ?? []}
                parentId={main.id}
                columnHint="main"
                accent={accent}
                variant="default"
              />
            </div>
          </SortableColumnShell>
        </div>
      </SortableContext>
    </DndContext>
  );
}
