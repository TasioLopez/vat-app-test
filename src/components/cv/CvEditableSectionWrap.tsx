'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, RotateCcw, Trash2 } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CvSectionRenderer from '@/components/cv/sections/CvSectionRenderer';
import {
  getLayoutChoicesForSection,
  layoutOptionLabel,
} from '@/lib/cv/layout-editor-utils';
import { sectionLayoutClass } from '@/lib/cv/layout-classes';
import { getSectionTitle, uiLabel } from '@/lib/cv/section-labels';
import type { CvLayoutSection, CvSectionLayout } from '@/types/cv';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Props = {
  section: CvLayoutSection;
  accent: string;
  variant: 'default' | 'sidebar';
  className?: string;
};

export default function CvEditableSectionWrap({
  section,
  accent,
  variant,
  className,
}: Props) {
  const { activeLocale, removeLayoutSection, updateLayoutSection } = useCV();

  const labels = (key: string) => uiLabel(activeLocale, key);
  const title = getSectionTitle(section.type, activeLocale, section.title);
  const layoutChoices = getLayoutChoicesForSection(section.type);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRemove = () => {
    const msg = labels('removeSectionConfirm').replace('{title}', title);
    if (window.confirm(msg)) {
      removeLayoutSection(section.id);
    }
  };

  const handleLayoutChange = (layout: CvSectionLayout) => {
    updateLayoutSection(section.id, { layout });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sectionLayoutClass(section.layout),
        'group/section relative',
        !section.visible && 'opacity-50',
        className
      )}
    >
      <div
        className={cn(
          'cv-no-print pointer-events-none absolute inset-0 z-10 rounded-sm border-2 border-transparent transition-colors',
          'group-hover/section:border-sky-400/70 group-focus-within/section:border-sky-400/70'
        )}
        aria-hidden
      />
      <div
        className={cn(
          'cv-no-print pointer-events-none absolute -top-2 left-0 right-0 z-20 flex items-center justify-between gap-1 px-0.5',
          'opacity-0 transition-opacity group-hover/section:opacity-100 group-focus-within/section:opacity-100'
        )}
      >
        <div className="pointer-events-auto flex min-w-0 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
          <button
            type="button"
            className="shrink-0 cursor-grab rounded p-0.5 text-gray-400 hover:text-gray-600"
            aria-label={labels('dragToReorder')}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          {title ? (
            <span className="max-w-[5rem] truncate text-[10px] font-medium text-gray-600">
              {title}
            </span>
          ) : null}
          {section.title ? (
            <button
              type="button"
              onClick={() => updateLayoutSection(section.id, { title: undefined })}
              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title={labels('resetSectionTitle')}
              aria-label={labels('resetSectionTitle')}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => updateLayoutSection(section.id, { visible: !section.visible })}
            className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-100"
            title={section.visible ? labels('hidden') : labels('show')}
            aria-label={section.visible ? labels('hidden') : labels('show')}
          >
            {section.visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            title={labels('removeSection')}
            aria-label={labels('removeSection')}
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {layoutChoices.length > 1 ? (
            <Select value={section.layout} onValueChange={(v) => handleLayoutChange(v as CvSectionLayout)}>
              <SelectTrigger className="h-5 w-[4.5rem] border-0 px-1 text-[9px] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layoutChoices.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {layoutOptionLabel(l, activeLocale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>
      <div className={cn(!section.visible && 'pointer-events-none')}>
        <CvSectionRenderer section={section} variant={variant} accent={accent} />
      </div>
    </div>
  );
}
