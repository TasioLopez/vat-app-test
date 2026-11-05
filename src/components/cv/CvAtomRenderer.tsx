'use client';

import { CvHeaderLockup } from '@/components/cv/CvChromeBlocks';
import CvEditableSectionWrap from '@/components/cv/CvEditableSectionWrap';
import CvSectionRenderer from '@/components/cv/sections/CvSectionRenderer';
import type { CvAtomDescriptor } from '@/lib/cv/atoms';
import { findSectionById } from '@/lib/cv/atoms';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

type Props = {
  atom: CvAtomDescriptor;
  sections: CvLayoutSection[];
  accent: string;
  variant: 'default' | 'sidebar';
  readOnly: boolean;
};

export default function CvAtomRenderer({ atom, sections, accent, variant, readOnly }: Props) {
  if (atom.kind === 'half_pair') {
    const a = findSectionById(sections, atom.sectionIds[0]);
    const b = findSectionById(sections, atom.sectionIds[1]);
    if (!a && !b) return null;
    return (
      <div className="flex w-full flex-wrap -mx-1">
        {a ? (
          readOnly ? (
            <div className="w-1/2 px-1">
              <CvSectionRenderer section={a} variant={variant} accent={accent} />
            </div>
          ) : (
            <CvEditableSectionWrap section={a} accent={accent} variant={variant} />
          )
        ) : null}
        {b ? (
          readOnly ? (
            <div className="w-1/2 px-1">
              <CvSectionRenderer section={b} variant={variant} accent={accent} />
            </div>
          ) : (
            <CvEditableSectionWrap section={b} accent={accent} variant={variant} />
          )
        ) : null}
      </div>
    );
  }

  if (atom.kind === 'grid3') {
    const section = findSectionById(sections, atom.sectionId);
    if (!section?.children?.length) return null;
    return (
      <div className="grid grid-cols-3 gap-4">
        {section.children.map((child) =>
          child.visible ? (
            readOnly ? (
              <CvSectionRenderer
                key={child.id}
                section={child}
                variant="default"
                accent={accent}
                forceReadOnly
              />
            ) : (
              <CvEditableSectionWrap
                key={child.id}
                section={child}
                accent={accent}
                variant="default"
              />
            )
          ) : null
        )}
      </div>
    );
  }

  if (atom.kind === 'header_lockup') {
    const lockupSections = atom.sectionIds
      .map((id) => findSectionById(sections, id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    return <CvHeaderLockup readOnly={readOnly} accent={accent} sections={lockupSections} />;
  }

  if (atom.kind === 'footer_strip') {
    const footerSections = atom.sectionIds
      .map((id) => findSectionById(sections, id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s && s.visible));
    return (
      <div className="flex flex-col gap-1 border-t border-gray-200 pt-2">
        {footerSections.map((section) => (
          <CvSectionRenderer
            key={section.id}
            section={section}
            variant="default"
            accent={accent}
            density="inline"
            forceReadOnly={readOnly}
          />
        ))}
      </div>
    );
  }

  const section = findSectionById(sections, atom.sectionId);
  if (!section) return null;

  if (atom.kind === 'section_header') {
    return (
      <div className={cn(!section.visible && 'opacity-50')}>
        {readOnly ? (
          <CvSectionRenderer
            section={section}
            variant={variant}
            accent={accent}
            fragment="header"
            forceReadOnly={readOnly}
          />
        ) : (
          <div className="group/section relative">
            <CvSectionRenderer
              section={section}
              variant={variant}
              accent={accent}
              fragment="header"
            />
          </div>
        )}
      </div>
    );
  }

  if (atom.kind === 'experience_item' || atom.kind === 'education_item') {
    return (
      <CvSectionRenderer
        section={section}
        variant={variant}
        accent={accent}
        fragment="item"
        itemId={atom.itemId}
        forceReadOnly={readOnly}
      />
    );
  }

  // kind === 'section'
  if (readOnly) {
    return (
      <CvSectionRenderer section={section} variant={variant} accent={accent} forceReadOnly />
    );
  }
  return <CvEditableSectionWrap section={section} accent={accent} variant={variant} />;
}
