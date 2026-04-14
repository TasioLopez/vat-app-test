'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
};

export default function InlineEditableText({
  value,
  onChange,
  multiline = false,
  className,
  placeholder = '…',
  as: Tag = 'span',
}: Props) {
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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
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

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          rows={4}
          className={inputClass}
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
        onKeyDown={onKeyDown}
        className={inputClass}
        placeholder={placeholder}
      />
    );
  }

  const displayClass = cn(
    'cursor-text rounded px-0.5 transition-colors hover:bg-black/5',
    !value && 'text-gray-400 italic',
    className
  );

  return (
    <Tag
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEditing(true);
        }
      }}
      tabIndex={0}
      className={displayClass}
    >
      {value || placeholder}
    </Tag>
  );
}
