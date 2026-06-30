'use client';

import { Plus, X, GripVertical } from 'lucide-react';
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
import InlineEditableText from '@/components/cv/InlineEditableText';
import { cn } from '@/lib/utils';

type Item = { id: string; text: string };

type Props = {
  title: string;
  onTitleChange?: (title: string) => void;
  items: Item[];
  onChange: (id: string, text: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  sortable?: boolean;
  readOnly?: boolean;
  className?: string;
  itemTextClassName?: string;
  variant?: 'default' | 'sidebar';
  showBullets?: boolean;
};

function SortableListRow({
  item,
  sortable,
  readOnly,
  showBullets,
  onChange,
  onRemove,
  itemTextClassName,
  variant,
}: {
  item: Item;
  sortable: boolean;
  readOnly: boolean;
  showBullets: boolean;
  onChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  itemTextClassName: string;
  variant: 'default' | 'sidebar';
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    disabled: !sortable || readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isSidebar = variant === 'sidebar';

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('group flex items-start gap-2', isSidebar && 'relative')}
    >
      {sortable && !readOnly && (
        <button
          type="button"
          className={cn(
            'shrink-0 rounded p-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100',
            isSidebar ? 'absolute left-0 top-0 mt-0.5' : 'mt-0.5'
          )}
          {...attributes}
          {...listeners}
          aria-label="Versleep"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {showBullets && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
      )}
      <div className="min-w-0 flex-1">
        <InlineEditableText
          value={item.text}
          onChange={(v) => onChange(item.id, v)}
          className={cn('block w-full text-sm', itemTextClassName)}
          readOnly={readOnly}
        />
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
          aria-label="Verwijderen"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export default function InlineEditableList({
  title,
  onTitleChange,
  items,
  onChange,
  onAdd,
  onRemove,
  onReorder,
  sortable = false,
  readOnly = false,
  className,
  itemTextClassName = 'text-gray-800',
  variant = 'default',
  showBullets = true,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const listContent = (
    <ul className={cn('space-y-1', variant === 'sidebar' && 'm-0 list-none p-0')}>
      {items.map((item) => (
        <SortableListRow
          key={item.id}
          item={item}
          sortable={sortable}
          readOnly={readOnly}
          onChange={onChange}
          onRemove={onRemove}
          itemTextClassName={itemTextClassName}
          showBullets={showBullets}
          variant={variant}
        />
      ))}
    </ul>
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        {onTitleChange ? (
          <InlineEditableText
            value={title}
            onChange={onTitleChange}
            as="h3"
            readOnly={readOnly}
            className={cn(
              'border-b pb-1 text-xs font-semibold uppercase tracking-wide',
              variant === 'sidebar'
                ? 'border-white/30 text-white'
                : 'border-transparent text-[var(--cv-accent)]'
            )}
          />
        ) : (
          <h3
            className={cn(
              'border-b pb-1 text-xs font-semibold uppercase tracking-wide',
              variant === 'sidebar'
                ? 'border-white/30 text-white'
                : 'border-transparent text-[var(--cv-accent)]'
            )}
          >
            {title}
          </h3>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm print:hidden hover:bg-gray-50"
            aria-label="Toevoegen"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      {sortable && onReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const ids = items.map((i) => i.id);
            const from = ids.indexOf(String(active.id));
            const to = ids.indexOf(String(over.id));
            if (from >= 0 && to >= 0) onReorder(from, to);
          }}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {listContent}
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}
    </div>
  );
}
