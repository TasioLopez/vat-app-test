'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useCV } from '@/context/CVContext';
import { canAddSection } from '@/lib/cv/layout-utils';
import {
  ADD_LAYOUT_OPTIONS,
  getDefaultAddLayoutForColumn,
  layoutOptionLabel,
} from '@/lib/cv/layout-editor-utils';
import { ADDABLE_SECTION_TYPES } from '@/lib/cv/section-registry';
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
import { cn } from '@/lib/utils';

type ColumnHint = 'sidebar' | 'main' | 'root';

type Props = {
  parentId: string | null;
  columnHint: ColumnHint;
  variant?: 'default' | 'sidebar';
  className?: string;
};

export default function CvAddSectionControl({
  parentId,
  columnHint,
  variant = 'default',
  className,
}: Props) {
  const { layout, activeLocale, addLayoutSection } = useCV();
  const labels = (key: string) => uiLabel(activeLocale, key);
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState<CvSectionType>('profile');
  const [newLayout, setNewLayout] = useState<CvSectionLayout>(
    getDefaultAddLayoutForColumn(columnHint)
  );

  const layoutOptions =
    columnHint === 'root'
      ? ADD_LAYOUT_OPTIONS
      : (['full', 'half'] as CvSectionLayout[]);

  const handleAdd = () => {
    if (!canAddSection(layout, newType)) {
      window.alert(labels('duplicateSection'));
      return;
    }
    const routingLayout =
      columnHint === 'sidebar' ? 'sidebar' : columnHint === 'main' ? 'main' : newLayout;
    const ok = addLayoutSection(newType, routingLayout, parentId ?? undefined);
    if (!ok) {
      window.alert(labels('duplicateSection'));
      return;
    }
    setOpen(false);
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div className={cn('cv-no-print mt-2', className)}>
      {!open ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-full gap-1 text-xs opacity-60 hover:opacity-100',
            isSidebar
              ? 'text-white/90 hover:bg-white/10 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          )}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          {labels('addSection')}
        </Button>
      ) : (
        <div
          className={cn(
            'space-y-2 rounded-md border p-2',
            isSidebar ? 'border-white/30 bg-white/10' : 'border-gray-200 bg-gray-50'
          )}
        >
          <Select value={newType} onValueChange={(v) => setNewType(v as CvSectionType)}>
            <SelectTrigger
              className={cn('h-7 text-xs', isSidebar && 'border-white/30 bg-white/90')}
            >
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
          {columnHint === 'root' ? (
            <Select value={newLayout} onValueChange={(v) => setNewLayout(v as CvSectionLayout)}>
              <SelectTrigger
                className={cn('h-7 text-xs', isSidebar && 'border-white/30 bg-white/90')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {layoutOptionLabel(l, activeLocale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              onClick={() => setOpen(false)}
            >
              {activeLocale === 'en' ? 'Cancel' : 'Annuleren'}
            </Button>
            <Button type="button" size="sm" className="h-7 flex-1 gap-1 text-xs" onClick={handleAdd}>
              <Plus className="h-3 w-3" />
              {labels('add')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
