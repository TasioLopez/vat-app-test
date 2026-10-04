'use client';

import { useState, useEffect, type CSSProperties, type KeyboardEvent } from 'react';
import { useCV } from '@/context/CVContext';
import type { CvFieldSelection } from '@/types/cv';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  readOnly?: boolean;
  style?: CSSProperties;
  /** When true, empty non-editing values render nothing (and nothing in print). */
  hideWhenEmpty?: boolean;
  /** Registers this field as the toolbar selection target. */
  selection?: CvFieldSelection;
};

export default function InlineEditableText({
  value,
  onChange,
  multiline = false,
  className,
  placeholder = '…',
  as: Tag = 'span',
  readOnly = false,
  style,
  hideWhenEmpty = false,
  selection,
}: Props) {
  const cv = useCV();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const selectField = () => {
    if (selection && !readOnly) {
      cv.setSelectedField(selection);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (multiline && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };

  const inputClass = cn(
    'w-full rounded border border-sky-400 bg-white px-1 py-0.5 text-inherit outline-none ring-2 ring-sky-200',
    className
  );

  const selected =
    selection &&
    cv.selectedField &&
    cv.selectedField.itemType === selection.itemType &&
    cv.selectedField.itemId === selection.itemId &&
    cv.selectedField.field === selection.field;

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onFocus={selectField}
          onKeyDown={onKeyDown}
          rows={4}
          className={inputClass}
          style={style}
          placeholder={placeholder}
        />
      );
    }
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onFocus={selectField}
        onKeyDown={onKeyDown}
        className={inputClass}
        style={style}
        placeholder={placeholder}
      />
    );
  }

  if (readOnly) {
    if (!value && hideWhenEmpty) return null;
    if (!value) return null;
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  if (!value && hideWhenEmpty && !editing) {
    // Still allow re-adding via a compact ghost control when selected parent shows it —
    // for hideWhenEmpty optional fields, show a faint clickable placeholder only on hover of parent group.
    return (
      <Tag
        onClick={() => {
          selectField();
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectField();
            setEditing(true);
          }
        }}
        tabIndex={0}
        className={cn(
          'cv-no-print cursor-text rounded px-0.5 text-xs italic opacity-0 transition-opacity',
          'group-hover:opacity-60 hover:!opacity-100',
          className
        )}
        style={style}
      >
        {placeholder}
      </Tag>
    );
  }

  const displayClass = cn(
    'cursor-text rounded px-0.5 transition-colors hover:bg-black/5',
    !value && 'text-gray-400 italic',
    selected && 'ring-2 ring-sky-300 ring-offset-1',
    className
  );

  return (
    <Tag
      onClick={() => {
        selectField();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectField();
          setEditing(true);
        }
      }}
      tabIndex={0}
      className={displayClass}
      style={style}
    >
      {value || placeholder}
    </Tag>
  );
}
