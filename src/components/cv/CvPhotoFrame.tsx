'use client';

import { cn } from '@/lib/utils';
import type { CvPhotoCrop } from '@/types/cv';

type Props = {
  src: string | null;
  crop?: CvPhotoCrop | undefined;
  alt?: string;
  /** Clipping + sizing for the frame (e.g. rounded-full h-24 w-24) */
  frameClassName?: string;
  placeholder?: React.ReactNode;
};

function cropToImageStyle(crop: CvPhotoCrop): React.CSSProperties {
  const w = Math.max(crop.width, 0.0001);
  const h = Math.max(crop.height, 0.0001);
  return {
    position: 'absolute',
    maxWidth: 'none',
    width: `${10000 / w}%`,
    height: `${10000 / h}%`,
    left: `${(-crop.x / w) * 100}%`,
    top: `${(-crop.y / h) * 100}%`,
  };
}

export default function CvPhotoFrame({
  src,
  crop,
  alt = '',
  frameClassName,
  placeholder = <span className="text-[10px] opacity-80">Foto</span>,
}: Props) {
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-black/10', frameClassName)}>
      {src ? (
        crop ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL / blob preview
          <img src={src} alt={alt} className="absolute max-h-none max-w-none" style={cropToImageStyle(crop)} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover object-center" />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center">{placeholder}</div>
      )}
    </div>
  );
}
