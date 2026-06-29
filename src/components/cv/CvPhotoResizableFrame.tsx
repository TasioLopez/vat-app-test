'use client';

import { useCallback, useRef } from 'react';
import CvPhotoFrame from '@/components/cv/CvPhotoFrame';
import { clampCvPhotoSizePx } from '@/lib/cv/photo-size';
import type { CvPhotoCrop } from '@/types/cv';
import { cn } from '@/lib/utils';

type Props = {
  src: string | null;
  crop?: CvPhotoCrop;
  alt?: string;
  sizePx: number;
  isSidebar?: boolean;
  resizable?: boolean;
  onSizeChange?: (sizePx: number) => void;
  placeholder?: React.ReactNode;
};

export default function CvPhotoResizableFrame({
  src,
  crop,
  alt = '',
  sizePx,
  isSidebar = false,
  resizable = false,
  onSizeChange,
  placeholder,
}: Props) {
  const dragRef = useRef<{ x: number; y: number; size: number } | null>(null);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!resizable || !onSizeChange) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY, size: sizePx };
    },
    [onSizeChange, resizable, sizePx]
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const start = dragRef.current;
      if (!start || !onSizeChange) return;
      const delta = (e.clientX - start.x + e.clientY - start.y) / 2;
      onSizeChange(clampCvPhotoSizePx(start.size + delta));
    },
    [onSizeChange]
  );

  return (
    <div className="group/photo relative inline-flex overflow-visible p-1">
      <CvPhotoFrame
        src={src}
        crop={crop}
        alt={alt}
        placeholder={placeholder}
        frameClassName={cn(
          'shrink-0 border-4 bg-white/20',
          isSidebar ? 'rounded-full border-white/40' : 'rounded-lg border-gray-200'
        )}
        frameStyle={{ width: sizePx, height: sizePx }}
      />
      {resizable && onSizeChange ? (
        <button
          type="button"
          aria-label="Fotoformaat aanpassen"
          title="Sleep om grootte aan te passen"
          className={cn(
            'cv-no-print absolute bottom-0 right-0 z-50 flex h-6 w-6 items-center justify-center',
            'rounded-md border-2 border-sky-500 bg-white shadow-md',
            'cursor-se-resize touch-none opacity-100',
            'hover:border-sky-600 hover:bg-sky-50'
          )}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        >
          <span
            className="block h-2.5 w-2.5 border-b-2 border-r-2 border-sky-600"
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
