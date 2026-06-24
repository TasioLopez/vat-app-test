import { ValentineZLogoBullet } from '@/components/tp2026/primitives';

interface ActivityBodyProps {
  bodyMain: string;
  subText?: string | null;
  className?: string;
}

export function ActivityBody({ bodyMain, subText, className = "" }: ActivityBodyProps) {
  const hasSubText = typeof subText === "string" && subText.trim().length > 0;

  return (
    <div className={className}>
      <p className={`text-[12px] leading-relaxed text-neutral-900 ${hasSubText ? 'mb-2' : ''}`}>{bodyMain}</p>
      {hasSubText && (
        <div className="flex items-start gap-2 mt-2">
          <ValentineZLogoBullet className="mt-1 shrink-0" />
          <span className="text-[12px] leading-relaxed text-neutral-900">{subText!.trim()}</span>
        </div>
      )}
    </div>
  );
}
