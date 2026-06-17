'use client';

import ColumnSectionFlow from '@/components/cv/ColumnSectionFlow';
import CvEditableColumnFlow from '@/components/cv/CvEditableColumnFlow';
import CvTwoColumnEditable from '@/components/cv/CvTwoColumnEditable';
import CvSectionRenderer from '@/components/cv/sections/CvSectionRenderer';
import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import { getCvTheme } from '@/lib/cv/theme-config';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

export default function CvLayoutRenderer() {
  const { layout, accentColor, templateKey, cvData, layoutOptions, readOnly } = useCV();
  const theme = getCvTheme(templateKey);
  const accent = accentColor;
  const showPhoto = cvData.options?.includePhotoInCv === true;
  const sidebarPosition = layoutOptions.sidebarPosition ?? 'left';

  const sidebarHasPhotoFirst = (children: CvLayoutSection[]) => {
    const photo = children.find((c) => c.type === 'photo');
    return Boolean(photo?.visible && showPhoto);
  };

  const renderTwoColumn = (section: CvLayoutSection) => (
    <CvTwoColumnEditable section={section} accent={accent} showPhoto={showPhoto} />
  );

  if (!readOnly) {
    return (
      <CVA4Canvas>
        <div
          className={cn(theme.rootClass, 'w-full flex-col')}
          style={{ '--cv-accent': accent } as React.CSSProperties}
        >
          <CvEditableColumnFlow
            sections={layout}
            parentId={null}
            columnHint="root"
            accent={accent}
            variant="default"
            showAddControl={false}
            renderTwoColumn={renderTwoColumn}
          />
        </div>
      </CVA4Canvas>
    );
  }

  return (
    <CVA4Canvas>
      <div
        className={cn(theme.rootClass, 'w-full')}
        style={{ '--cv-accent': accent } as React.CSSProperties}
      >
        {layout.map((section) => {
          if (section.layout === 'two_column' && section.children?.length) {
            const sidebar = section.children.find((c) => c.layout === 'sidebar');
            const main = section.children.find((c) => c.layout === 'main');
            return (
              <div
                key={section.id}
                className={cn(
                  'flex min-h-[297mm] w-full flex-1 items-stretch',
                  sidebarPosition === 'right' && 'flex-row-reverse'
                )}
              >
                {sidebar && (
                  <aside
                    className={cn(theme.sidebarClass, 'min-h-full self-stretch')}
                    style={{ backgroundColor: accent }}
                  >
                    <ColumnSectionFlow
                      sections={sidebar.children ?? []}
                      accent={accent}
                      variant="sidebar"
                      isFirstColumnSection={!sidebarHasPhotoFirst(sidebar.children ?? [])}
                    />
                  </aside>
                )}
                {main && (
                  <div className={cn(theme.mainClass, 'min-h-full flex-1')}>
                    <ColumnSectionFlow
                      sections={main.children ?? []}
                      accent={accent}
                      variant="default"
                    />
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
