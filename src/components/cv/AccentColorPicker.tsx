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
};

export default function AccentColorPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-gray-600">Accentkleur:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.id}
            onClick={() => onChange(p.hex)}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-transform hover:scale-105',
              value.toLowerCase() === p.hex.toLowerCase()
                ? 'border-gray-900 ring-2 ring-offset-1'
                : 'border-transparent'
            )}
            style={{ backgroundColor: p.hex }}
          />
        ))}
        <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-white hover:border-gray-400">
          <input
            type="color"
            value={value.startsWith('#') ? value : '#00A3CC'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-[200%] w-[200%] cursor-pointer opacity-0"
            aria-label="Aangepaste kleur"
          />
          <span className="pointer-events-none text-[10px] font-bold text-gray-500">+</span>
        </label>
      </div>
    </div>
  );
}
