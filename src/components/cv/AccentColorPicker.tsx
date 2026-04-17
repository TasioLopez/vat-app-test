'use client';

import { cn } from '@/lib/utils';

const PRESETS = [
  { id: 'blue', hex: '#00A3CC' },
  { id: 'purple', hex: '#7C3AED' },
  { id: 'teal', hex: '#0D9488' },
  { id: 'orange', hex: '#EA580C' },
  { id: 'pink', hex: '#DB2777' },
  { id: 'indigo', hex: '#4F46E5' },
];

type Props = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  /** compact: smaller swatches, no visible label (sr-only), single row */
  variant?: 'default' | 'compact';
};

export default function AccentColorPicker({
  value,
  onChange,
  className,
  variant = 'default',
}: Props) {
  const compact = variant === 'compact';
  const dot = compact ? 'h-7 w-7' : 'h-8 w-8';
  const gap = compact ? 'gap-1' : 'gap-1.5';

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center',
        compact ? 'gap-1' : 'gap-2 flex-wrap',
        className
      )}
    >
      <span className={cn(compact ? 'sr-only' : 'text-sm text-gray-600')}>Accentkleur</span>
      <div className={cn('flex flex-nowrap items-center', gap)}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.id}
            aria-label={`Accentkleur ${p.id}`}
            onClick={() => onChange(p.hex)}
            className={cn(
              'shrink-0 rounded-full border-2 transition-transform hover:scale-105',
              dot,
              value.toLowerCase() === p.hex.toLowerCase()
                ? 'border-gray-900 ring-2 ring-offset-1'
                : 'border-transparent'
            )}
            style={{ backgroundColor: p.hex }}
          />
        ))}
        <label
          className={cn(
            'relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-white hover:border-gray-400',
            dot
          )}
        >
          <input
            type="color"
            value={value.startsWith('#') ? value : '#00A3CC'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-[200%] w-[200%] cursor-pointer opacity-0"
            aria-label="Aangepaste accentkleur"
          />
          <span className="pointer-events-none text-[10px] font-bold text-gray-500">+</span>
        </label>
      </div>
    </div>
  );
}
