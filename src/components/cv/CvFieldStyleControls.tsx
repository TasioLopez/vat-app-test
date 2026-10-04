'use client';

import { Eraser, X } from 'lucide-react';
import AccentColorPicker from '@/components/cv/AccentColorPicker';
import { Button } from '@/components/ui/button';
import { useCV } from '@/context/CVContext';
import { uiLabel } from '@/lib/cv/section-labels';
import { isOptionalCvField } from '@/types/cv';

/**
 * Selection-aware toolbar cluster: text color + clear for optional subtext,
 * or document accent when nothing is selected.
 */
export default function CvFieldStyleControls() {
  const {
    selectedField,
    setSelectedField,
    updateSelectedFieldStyle,
    clearSelectedFieldValue,
    accentColor,
    setAccentColor,
    activeLocale,
    cvData,
  } = useCV();

  const labels = (key: string) => uiLabel(activeLocale, key);

  if (!selectedField) {
    return <AccentColorPicker variant="compact" value={accentColor} onChange={setAccentColor} />;
  }

  let currentColor = accentColor;
  if (selectedField.itemType === 'experience') {
    const item = cvData.experience.find((x) => x.id === selectedField.itemId);
    currentColor = item?.styles?.[selectedField.field]?.color || '#4B5563';
  } else if (selectedField.itemType === 'education') {
    const item = cvData.education.find((x) => x.id === selectedField.itemId);
    currentColor = item?.styles?.[selectedField.field]?.color || '#4B5563';
  } else if (selectedField.itemType === 'language') {
    const item = cvData.languages.find((x) => x.id === selectedField.itemId);
    currentColor = item?.styles?.[selectedField.field]?.color || '#4B5563';
  } else if (selectedField.itemType === 'skill') {
    const item = cvData.skills.find((x) => x.id === selectedField.itemId);
    currentColor = item?.styles?.text?.color || '#4B5563';
  } else if (selectedField.itemType === 'interest') {
    const item = cvData.interests.find((x) => x.id === selectedField.itemId);
    currentColor = item?.styles?.text?.color || '#4B5563';
  }

  const canClear = isOptionalCvField(selectedField);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="hidden text-[10px] font-medium text-gray-500 sm:inline">
        {labels('textColor')}
      </span>
      <AccentColorPicker
        variant="compact"
        value={currentColor}
        onChange={(hex) => updateSelectedFieldStyle({ color: hex })}
      />
      {canClear ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={clearSelectedFieldValue}
          title={labels('clearField')}
        >
          <Eraser className="h-3.5 w-3.5" />
          {labels('clearField')}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setSelectedField(null)}
        aria-label={labels('deselectField')}
        title={labels('deselectField')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
