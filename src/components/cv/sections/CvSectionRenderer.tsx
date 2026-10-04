'use client';

import { Mail, Phone, MapPin, Plus, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCV } from '@/context/CVContext';
import CvPhotoResizableFrame from '@/components/cv/CvPhotoResizableFrame';
import { getCvPhotoSizePx } from '@/lib/cv/photo-size';
import InlineEditableText from '@/components/cv/InlineEditableText';
import InlineEditableList from '@/components/cv/InlineEditableList';
import { getSectionTitle, resolveSectionTitleOverride, uiLabel } from '@/lib/cv/section-labels';
import { getCvTheme } from '@/lib/cv/theme-config';
import type { CvLayoutSection, CvLocale } from '@/types/cv';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'sidebar';

export type CvSectionFragment = 'full' | 'header' | 'item';

type Props = {
  section: CvLayoutSection;
  variant?: Variant;
  accent: string;
  /** Pagination fragment: header-only or single experience/education item. */
  fragment?: CvSectionFragment;
  itemId?: string;
};

function EditableSectionTitle({
  section,
  locale,
  title,
  className,
  style,
  as = 'h2',
  readOnly,
}: {
  section: CvLayoutSection;
  locale: CvLocale;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h2' | 'h3';
  readOnly: boolean;
}) {
  const { updateLayoutSection } = useCV();
  if (!title) return null;

  return (
    <InlineEditableText
      value={title}
      onChange={(value) =>
        updateLayoutSection(section.id, {
          title: resolveSectionTitleOverride(section.type, locale, value),
        })
      }
      as={as}
      className={className}
      style={style}
      readOnly={readOnly}
    />
  );
}

function SortableExperienceItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { readOnly } = useCV();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative border-l-2 border-gray-200 pl-3">
      {!readOnly && (
        <button
          type="button"
          className="absolute -left-5 top-0 rounded p-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100"
          {...attributes}
          {...listeners}
          aria-label="Versleep"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {children}
    </div>
  );
}

export default function CvSectionRenderer({
  section,
  variant = 'default',
  accent,
  fragment = 'full',
  itemId,
}: Props) {
  const {
    cvData,
    activeLocale,
    templateKey,
    photoDisplayUrl,
    readOnly,
    updatePersonal,
    setProfile,
    setExtra,
    setDigitalSkills,
    addExperience,
    updateExperience,
    removeExperience,
    reorderExperience,
    addEducation,
    updateEducation,
    removeEducation,
    reorderEducation,
    addSkill,
    updateSkill,
    removeSkill,
    reorderSkills,
    addLanguage,
    updateLanguage,
    removeLanguage,
    reorderLanguages,
    addInterest,
    updateInterest,
    removeInterest,
    reorderInterests,
    updateLayoutSection,
  } = useCV();

  const locale = activeLocale;
  const theme = getCvTheme(templateKey);
  const labels = (key: string) => uiLabel(locale, key);
  const title = getSectionTitle(section.type, locale, section.title);
  const isSidebar = variant === 'sidebar';
  const titleClass = isSidebar
    ? 'mt-1 border-b border-white/30 pb-1 text-xs font-semibold uppercase tracking-wide text-white'
    : 'mb-2 mt-1 text-sm font-semibold uppercase tracking-wide';
  const titleStyle = isSidebar ? undefined : ({ color: accent } as React.CSSProperties);
  const bodyTextClass = isSidebar ? 'text-white/95' : 'text-gray-700';
  const metaTextClass = isSidebar ? 'text-white/80' : 'text-gray-500';
  const headingTextClass = isSidebar ? 'text-white' : 'text-gray-900';
  const sectionTitleProps = {
    section,
    locale,
    title,
    readOnly,
  };
  const handleListTitleChange = (value: string) =>
    updateLayoutSection(section.id, {
      title: resolveSectionTitleOverride(section.type, locale, value),
    });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (!section.visible) return null;

  if (section.type === 'personal_header') {
    return (
      <header className={isSidebar ? '' : 'border-b border-gray-200 pb-3'}>
        <InlineEditableText
          value={cvData.personal.fullName}
          onChange={(v) => updatePersonal({ fullName: v })}
          as="h1"
          className={cn(
            'block font-bold tracking-tight text-gray-900',
            isSidebar ? 'text-lg' : 'text-2xl'
          )}
          placeholder={labels('name')}
          readOnly={readOnly}
        />
        <InlineEditableText
          value={cvData.personal.title}
          onChange={(v) => updatePersonal({ title: v })}
          as="p"
          className="mt-1 text-sm font-medium text-gray-600"
          placeholder={labels('title')}
          readOnly={readOnly}
        />
      </header>
    );
  }

  if (section.type === 'photo') {
    const showPhotoOption = cvData.options?.includePhotoInCv === true;
    if (!showPhotoOption && readOnly) return null;
    const sizePx = getCvPhotoSizePx(cvData.personal.photoSizePx, isSidebar);

    return (
      <div className="flex flex-col items-center gap-2 overflow-visible pb-2">
        <CvPhotoResizableFrame
          src={photoDisplayUrl}
          crop={cvData.personal.photoCrop}
          alt=""
          sizePx={sizePx}
          isSidebar={isSidebar}
          resizable={!readOnly}
          onSizeChange={(photoSizePx) => updatePersonal({ photoSizePx })}
          placeholder={
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
              {getSectionTitle('photo', locale)}
            </div>
          }
        />
      </div>
    );
  }

  if (section.type === 'contact') {
    const textClass = isSidebar ? 'text-[11px] text-white' : 'text-[11px] text-gray-800';
    const iconClass = isSidebar ? 'text-white/90' : 'text-gray-500';
    const contactTitleClass = isSidebar ? theme.sidebarTitleClass : cn(titleClass, 'mb-2');
    return (
      <section>
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={cn(contactTitleClass, isSidebar && 'text-white')}
            style={isSidebar ? undefined : titleStyle}
            as="h3"
          />
        ) : null}
        <ul className={cn('mt-1 space-y-2', isSidebar && 'm-0 list-none p-0 text-white/95')}>
          <li className="flex items-start gap-2">
            <Phone className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', iconClass)} />
            <InlineEditableText
              value={cvData.personal.phone}
              onChange={(v) => updatePersonal({ phone: v })}
              className={textClass}
              placeholder={labels('phone')}
              readOnly={readOnly}
            />
          </li>
          <li className="flex items-start gap-2">
            <Mail className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', iconClass)} />
            <InlineEditableText
              value={cvData.personal.email}
              onChange={(v) => updatePersonal({ email: v })}
              className={cn(textClass, 'break-all')}
              placeholder={labels('email')}
              readOnly={readOnly}
            />
          </li>
          <li className="flex items-start gap-2">
            <MapPin className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', iconClass)} />
            <InlineEditableText
              value={cvData.personal.location}
              onChange={(v) => updatePersonal({ location: v })}
              className={textClass}
              placeholder={labels('location')}
              readOnly={readOnly}
            />
          </li>
        </ul>
      </section>
    );
  }

  if (section.type === 'profile') {
    return (
      <section>
        {section.subsection && (
          <p className="mb-1 text-xs font-medium text-gray-500">{section.subsection}</p>
        )}
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={titleClass}
            style={titleStyle}
          />
        ) : null}
        <InlineEditableText
          value={cvData.profile}
          onChange={setProfile}
          multiline
          className="block w-full text-sm text-gray-700"
          placeholder={labels('profilePlaceholder')}
          readOnly={readOnly}
        />
      </section>
    );
  }

  if (section.type === 'digital_skills') {
    if (!cvData.digitalSkills?.trim() && readOnly) return null;
    return (
      <section>
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={cn(titleClass, isSidebar && 'text-white border-white/30')}
            style={titleStyle}
          />
        ) : null}
        <InlineEditableText
          value={cvData.digitalSkills ?? ''}
          onChange={setDigitalSkills}
          className={cn('block w-full text-sm', isSidebar ? 'text-white' : 'text-gray-700')}
          placeholder={labels('digitalSkillsPlaceholder')}
          readOnly={readOnly}
        />
      </section>
    );
  }

  if (section.type === 'skills') {
    return (
      <InlineEditableList
        title={title}
        onTitleChange={readOnly ? undefined : handleListTitleChange}
        items={cvData.skills}
        onChange={(id, text) => updateSkill(id, text)}
        onAdd={addSkill}
        onRemove={removeSkill}
        onReorder={reorderSkills}
        sortable={!readOnly}
        showBullets={!isSidebar}
        variant={isSidebar ? 'sidebar' : 'default'}
        itemTextClassName={isSidebar ? 'text-sm text-white' : 'text-sm text-gray-800'}
        readOnly={readOnly}
        selectionItemType="skill"
      />
    );
  }

  if (section.type === 'languages') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {title ? (
            <EditableSectionTitle
              {...sectionTitleProps}
              className={cn(
                'border-b pb-1 text-xs font-semibold uppercase tracking-wide',
                isSidebar
                  ? 'border-white/30 text-white'
                  : 'border-transparent text-[var(--cv-accent)]'
              )}
              as="h3"
            />
          ) : null}
          {!readOnly && (
            <button
              type="button"
              onClick={addLanguage}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm print:hidden hover:bg-gray-50"
              aria-label={labels('add')}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const ids = cvData.languages.map((l) => l.id);
            const from = ids.indexOf(String(active.id));
            const to = ids.indexOf(String(over.id));
            if (from >= 0 && to >= 0) reorderLanguages(from, to);
          }}
        >
          <SortableContext items={cvData.languages.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className={cn('space-y-2', isSidebar && 'm-0 list-none p-0')}>
              {cvData.languages.map((item) => (
                <LanguageRow
                  key={item.id}
                  item={item}
                  isSidebar={isSidebar}
                  readOnly={readOnly}
                  onUpdate={(patch) => updateLanguage(item.id, patch)}
                  onRemove={() => removeLanguage(item.id)}
                  labels={labels}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  if (section.type === 'interests') {
    return (
      <InlineEditableList
        title={title}
        onTitleChange={readOnly ? undefined : handleListTitleChange}
        items={cvData.interests}
        onChange={(id, text) => updateInterest(id, text)}
        onAdd={addInterest}
        onRemove={removeInterest}
        onReorder={reorderInterests}
        sortable={!readOnly}
        showBullets={!isSidebar}
        variant={isSidebar ? 'sidebar' : 'default'}
        itemTextClassName={isSidebar ? 'text-sm text-white' : 'text-sm text-gray-800'}
        readOnly={readOnly}
        selectionItemType="interest"
      />
    );
  }

  if (section.type === 'experience') {
    const showHeader = fragment === 'full' || fragment === 'header';
    const items =
      fragment === 'item' && itemId
        ? cvData.experience.filter((e) => e.id === itemId)
        : fragment === 'header'
          ? []
          : cvData.experience;

    const header = showHeader ? (
      <div className="mb-2 flex items-center justify-between">
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={titleClass}
            style={titleStyle}
          />
        ) : null}
        {!readOnly && (
          <button
            type="button"
            onClick={addExperience}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
            aria-label={labels('add')}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    ) : null;

    if (fragment === 'header') {
      return <section>{header}</section>;
    }

    return (
      <section>
        {header}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const ids = cvData.experience.map((x) => x.id);
            const from = ids.indexOf(String(active.id));
            const to = ids.indexOf(String(over.id));
            if (from >= 0 && to >= 0) reorderExperience(from, to);
          }}
        >
          <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((e) => (
                <SortableExperienceItem key={e.id} id={e.id}>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeExperience(e.id)}
                      className="absolute -right-1 -top-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      aria-label={labels('remove')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <InlineEditableText
                    value={e.role}
                    onChange={(v) => updateExperience(e.id, { role: v })}
                    className={cn('block text-sm font-semibold', headingTextClass)}
                    style={e.styles?.role?.color ? { color: e.styles.role.color } : undefined}
                    placeholder={labels('role')}
                    readOnly={readOnly}
                    selection={{ itemType: 'experience', itemId: e.id, field: 'role' }}
                  />
                  <div className={cn('flex flex-wrap gap-x-3 text-xs', metaTextClass)}>
                    <InlineEditableText
                      value={e.organization ?? ''}
                      onChange={(v) => updateExperience(e.id, { organization: v })}
                      className="inline min-w-[80px]"
                      style={
                        e.styles?.organization?.color
                          ? { color: e.styles.organization.color }
                          : undefined
                      }
                      placeholder={labels('organization')}
                      readOnly={readOnly}
                      hideWhenEmpty
                      selection={{ itemType: 'experience', itemId: e.id, field: 'organization' }}
                    />
                    <InlineEditableText
                      value={e.period ?? ''}
                      onChange={(v) => updateExperience(e.id, { period: v })}
                      className="inline min-w-[60px]"
                      style={e.styles?.period?.color ? { color: e.styles.period.color } : undefined}
                      placeholder={labels('period')}
                      readOnly={readOnly}
                      hideWhenEmpty
                      selection={{ itemType: 'experience', itemId: e.id, field: 'period' }}
                    />
                  </div>
                  <InlineEditableText
                    value={e.description ?? ''}
                    onChange={(v) => updateExperience(e.id, { description: v })}
                    multiline
                    className={cn('mt-1 block w-full text-sm', bodyTextClass)}
                    style={
                      e.styles?.description?.color
                        ? { color: e.styles.description.color }
                        : undefined
                    }
                    placeholder={labels('description')}
                    readOnly={readOnly}
                    hideWhenEmpty
                    selection={{ itemType: 'experience', itemId: e.id, field: 'description' }}
                  />
                </SortableExperienceItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    );
  }

  if (section.type === 'education') {
    const showHeader = fragment === 'full' || fragment === 'header';
    const items =
      fragment === 'item' && itemId
        ? cvData.education.filter((e) => e.id === itemId)
        : fragment === 'header'
          ? []
          : cvData.education;

    const header = showHeader ? (
      <div className="mb-2 flex items-center justify-between">
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={titleClass}
            style={titleStyle}
          />
        ) : null}
        {!readOnly && (
          <button
            type="button"
            onClick={addEducation}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
            aria-label={labels('add')}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    ) : null;

    if (fragment === 'header') {
      return <section>{header}</section>;
    }

    return (
      <section>
        {header}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            const ids = cvData.education.map((x) => x.id);
            const from = ids.indexOf(String(active.id));
            const to = ids.indexOf(String(over.id));
            if (from >= 0 && to >= 0) reorderEducation(from, to);
          }}
        >
          <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((ed) => (
                <SortableEducationItem key={ed.id} id={ed.id} readOnly={readOnly}>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeEducation(ed.id)}
                      className="absolute -right-1 -top-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      aria-label={labels('remove')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <InlineEditableText
                    value={ed.institution}
                    onChange={(v) => updateEducation(ed.id, { institution: v })}
                    className={cn('block text-sm font-semibold', headingTextClass)}
                    style={
                      ed.styles?.institution?.color
                        ? { color: ed.styles.institution.color }
                        : undefined
                    }
                    placeholder={labels('institution')}
                    readOnly={readOnly}
                    selection={{ itemType: 'education', itemId: ed.id, field: 'institution' }}
                  />
                  <InlineEditableText
                    value={ed.diploma ?? ''}
                    onChange={(v) => updateEducation(ed.id, { diploma: v })}
                    className={cn('block text-xs', metaTextClass)}
                    style={ed.styles?.diploma?.color ? { color: ed.styles.diploma.color } : undefined}
                    placeholder={labels('diploma')}
                    readOnly={readOnly}
                    hideWhenEmpty
                    selection={{ itemType: 'education', itemId: ed.id, field: 'diploma' }}
                  />
                  <InlineEditableText
                    value={ed.description ?? ''}
                    onChange={(v) => updateEducation(ed.id, { description: v })}
                    multiline
                    className={cn('mt-1 block w-full text-sm', bodyTextClass)}
                    style={
                      ed.styles?.description?.color
                        ? { color: ed.styles.description.color }
                        : undefined
                    }
                    placeholder={labels('description')}
                    readOnly={readOnly}
                    hideWhenEmpty
                    selection={{ itemType: 'education', itemId: ed.id, field: 'description' }}
                  />
                </SortableEducationItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    );
  }

  if (section.type === 'extra') {
    return (
      <section>
        {title ? (
          <EditableSectionTitle
            {...sectionTitleProps}
            className={titleClass}
            style={titleStyle}
          />
        ) : null}
        <InlineEditableText
          value={cvData.extra}
          onChange={setExtra}
          multiline
          className="block w-full text-sm text-gray-700"
          placeholder={labels('extraPlaceholder')}
          readOnly={readOnly}
        />
      </section>
    );
  }

  return null;
}

function SortableEducationItem({
  id,
  children,
  readOnly,
}: {
  id: string;
  children: React.ReactNode;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="group relative pl-4">
      {!readOnly && (
        <button
          type="button"
          className="absolute left-0 top-0 rounded p-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {children}
    </div>
  );
}

function LanguageRow({
  item,
  isSidebar,
  readOnly,
  onUpdate,
  onRemove,
  labels,
}: {
  item: {
    id: string;
    language: string;
    level?: string;
    styles?: Partial<Record<'language' | 'level', { color?: string }>>;
  };
  isSidebar: boolean;
  readOnly: boolean;
  onUpdate: (patch: { language?: string; level?: string }) => void;
  onRemove: () => void;
  labels: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const textClass = isSidebar ? 'text-sm text-white' : 'text-sm text-gray-800';
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn('group flex items-start gap-2', isSidebar && 'relative')}
    >
      {!readOnly && (
        <button
          type="button"
          className={cn(
            'shrink-0 rounded p-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100',
            isSidebar ? 'absolute left-0 top-0 mt-1' : 'mt-1'
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      {!isSidebar && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <InlineEditableText
          value={item.language}
          onChange={(v) => onUpdate({ language: v })}
          className={cn('block w-full font-medium', textClass)}
          style={item.styles?.language?.color ? { color: item.styles.language.color } : undefined}
          placeholder={labels('language')}
          readOnly={readOnly}
          selection={{ itemType: 'language', itemId: item.id, field: 'language' }}
        />
        <InlineEditableText
          value={item.level ?? ''}
          onChange={(v) => onUpdate({ level: v })}
          className={cn('block w-full text-xs opacity-90', textClass)}
          style={item.styles?.level?.color ? { color: item.styles.level.color } : undefined}
          placeholder={labels('level')}
          readOnly={readOnly}
          hideWhenEmpty
          selection={{ itemType: 'language', itemId: item.id, field: 'level' }}
        />
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
          aria-label={labels('remove')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
