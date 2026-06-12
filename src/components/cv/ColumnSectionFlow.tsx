'use client';

import CvSectionRenderer from '@/components/cv/sections/CvSectionRenderer';
import { sectionLayoutClass } from '@/lib/cv/layout-classes';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'sidebar';

type Props = {
  sections: CvLayoutSection[];
  accent: string;
  variant: Variant;
  /** First visible section gets extra top padding when photo is absent in sidebar */
  isFirstColumnSection?: boolean;
};

function SectionWrap({
  section,
  accent,
  variant,
  className,
}: {
  section: CvLayoutSection;
  accent: string;
  variant: Variant;
  className?: string;
}) {
  if (!section.visible) return null;
  return (
    <div className={cn(sectionLayoutClass(section.layout), className)}>
      <CvSectionRenderer section={section} variant={variant} accent={accent} />
    </div>
  );
}

/**
 * Renders column children respecting half-width pairs and section.layout.
 */
export default function ColumnSectionFlow({
  sections,
  accent,
  variant,
  isFirstColumnSection = false,
}: Props) {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let firstRendered = true;

  while (i < sections.length) {
    const section = sections[i];
    if (!section.visible) {
      i += 1;
      continue;
    }

    const extraClass =
      isFirstColumnSection && firstRendered && variant === 'sidebar' ? 'pt-1' : undefined;
    firstRendered = false;

    if (section.layout === 'half') {
      const pair: CvLayoutSection[] = [section];
      if (i + 1 < sections.length && sections[i + 1].visible && sections[i + 1].layout === 'half') {
        pair.push(sections[i + 1]);
        i += 2;
      } else {
        i += 1;
      }
      nodes.push(
        <div key={pair.map((p) => p.id).join('-')} className="flex w-full flex-wrap -mx-1">
          {pair.map((s) => (
            <SectionWrap
              key={s.id}
              section={s}
              accent={accent}
              variant={variant}
              className={extraClass}
            />
          ))}
        </div>
      );
      continue;
    }

    nodes.push(
      <SectionWrap
        key={section.id}
        section={section}
        accent={accent}
        variant={variant}
        className={extraClass}
      />
    );
    i += 1;
  }

  return <>{nodes}</>;
}
