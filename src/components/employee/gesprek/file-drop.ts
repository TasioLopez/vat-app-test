'use client';

import { useRef, useState, type DragEvent } from 'react';
import { meetingImportKind } from '@/lib/meetings/transcript';

type DropHandlers = {
  onDragEnter: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

/** Highlight a zone and pass the first .txt, .md, .docx, or .pdf to the existing upload handler. */
export function useGesprekFileDrop(disabled: boolean, onFile: (file: File) => void): {
  active: boolean;
  dropProps: DropHandlers;
} {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  function hasFiles(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  function onDragEnter(event: DragEvent) {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    setActive(true);
  }

  function onDragOver(event: DragEvent) {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(event: DragEvent) {
    if (disabled) return;
    event.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setActive(false);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    depth.current = 0;
    setActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (!file || !meetingImportKind(file.name)) return;
    onFile(file);
  }

  return { active, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
