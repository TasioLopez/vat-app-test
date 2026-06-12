'use client';

import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import CvSectionRenderer from '@/components/cv/sections/CvSectionRenderer';
import { getCvTheme } from '@/lib/cv/theme-config';
import type { CvLayoutSection } from '@/types/cv';

function renderSections(
  sections: CvLayoutSection[],
  accent: string,
  variant: 'default' | 'sidebar'
) {
  return sections.map((section) =>
    section.visible ? (
      <CvSectionRenderer
        key={section.id}
        section={section}
        variant={variant}
        accent={accent}
      />
    ) : null
  );
}

export default function CvLayoutRenderer() {
  const { layout, accentColor, templateKey } = useCV();
  const theme = getCvTheme(templateKey);
  const accent = accentColor;

  return (
    <CVA4Canvas>
      <div
        className={theme.rootClass}
        style={{ '--cv-accent': accent } as React.CSSProperties}
      >
        {layout.map((section) => {
          if (section.layout === 'two_column' && section.children?.length) {
            const sidebar = section.children.find((c) => c.layout === 'sidebar');
            const main = section.children.find((c) => c.layout === 'main');
            return (
              <div key={section.id} className="flex min-h-0 w-full flex-1">
                {sidebar && (
                  <aside
                    className={theme.sidebarClass}
                    style={{ backgroundColor: accent }}
                  >
                    {renderSections(sidebar.children ?? [], accent, 'sidebar')}
                  </aside>
                )}
                {main && (
                  <div className={theme.mainClass}>
                    {renderSections(main.children ?? [], accent, 'default')}
                  </div>
                )}
              </div>
            );
          }

          if (section.layout === 'grid_3' && section.children?.length) {
            return (
              <div key={section.id} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {section.children.map((child) =>
                  child.visible ? (
                    <CvSectionRenderer
                      key={child.id}
                      section={child}
                      variant="default"
                      accent={accent}
                    />
                  ) : null
                )}
              </div>
            );
          }

          if (section.visible) {
            return (
              <CvSectionRenderer
                key={section.id}
                section={section}
                variant="default"
                accent={accent}
              />
            );
          }
          return null;
        })}
      </div>
    </CVA4Canvas>
  );
}
