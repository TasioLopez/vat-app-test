'use client';

import { Mail, MapPin, Phone } from 'lucide-react';
import CvPhotoResizableFrame from '@/components/cv/CvPhotoResizableFrame';
import InlineEditableText from '@/components/cv/InlineEditableText';
import { useCV } from '@/context/CVContext';
import { getCvPhotoSizePx } from '@/lib/cv/photo-size';
import { getSectionTitle, uiLabel } from '@/lib/cv/section-labels';
import { CV_BAND_CONTINUATION_PX } from '@/lib/cv/theme-config';
import type { CvLayoutSection } from '@/types/cv';
import { cn } from '@/lib/utils';

const EDITORIAL_SERIF = 'Georgia, "Times New Roman", Times, serif';

function cappedPhotoSize(stored: number | undefined, cap: number, sidebarShape: boolean): number {
  return Math.min(getCvPhotoSizePx(stored, sidebarShape), cap);
}

function useShowPhoto(readOnly: boolean): boolean {
  const { cvData } = useCV();
  const optedIn = cvData.options?.includePhotoInCv === true;
  if (!optedIn && readOnly) return false;
  return true;
}

function NameFields({
  nameClass,
  titleClass,
  nameStyle,
  readOnly,
}: {
  nameClass: string;
  titleClass: string;
  nameStyle?: React.CSSProperties;
  readOnly: boolean;
}) {
  const { cvData, updatePersonal, activeLocale } = useCV();
  const labels = (key: string) => uiLabel(activeLocale, key);
  return (
    <>
      <InlineEditableText
        value={cvData.personal.fullName}
        onChange={(v) => updatePersonal({ fullName: v })}
        as="h1"
        className={nameClass}
        style={nameStyle}
        placeholder={labels('name')}
        readOnly={readOnly}
      />
      <InlineEditableText
        value={cvData.personal.title}
        onChange={(v) => updatePersonal({ title: v })}
        as="p"
        className={titleClass}
        placeholder={labels('title')}
        readOnly={readOnly}
      />
    </>
  );
}

function ContactMiddot({ readOnly, className }: { readOnly: boolean; className?: string }) {
  const { cvData, updatePersonal, activeLocale } = useCV();
  const labels = (key: string) => uiLabel(activeLocale, key);
  const field = 'min-w-[4rem] text-[11px]';
  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1', className)}>
      <InlineEditableText
        value={cvData.personal.phone}
        onChange={(v) => updatePersonal({ phone: v })}
        className={field}
        placeholder={labels('phone')}
        readOnly={readOnly}
        hideWhenEmpty={readOnly}
      />
      <span aria-hidden className="text-gray-300">
        ·
      </span>
      <InlineEditableText
        value={cvData.personal.email}
        onChange={(v) => updatePersonal({ email: v })}
        className={cn(field, 'break-all')}
        placeholder={labels('email')}
        readOnly={readOnly}
        hideWhenEmpty={readOnly}
      />
      <span aria-hidden className="text-gray-300">
        ·
      </span>
      <InlineEditableText
        value={cvData.personal.location}
        onChange={(v) => updatePersonal({ location: v })}
        className={field}
        placeholder={labels('location')}
        readOnly={readOnly}
        hideWhenEmpty={readOnly}
      />
    </div>
  );
}

function ContactIconRow({ readOnly }: { readOnly: boolean }) {
  const { cvData, updatePersonal, activeLocale } = useCV();
  const labels = (key: string) => uiLabel(activeLocale, key);
  const items = [
    {
      icon: Phone,
      value: cvData.personal.phone,
      placeholder: labels('phone'),
      onChange: (v: string) => updatePersonal({ phone: v }),
    },
    {
      icon: Mail,
      value: cvData.personal.email,
      placeholder: labels('email'),
      onChange: (v: string) => updatePersonal({ email: v }),
    },
    {
      icon: MapPin,
      value: cvData.personal.location,
      placeholder: labels('location'),
      onChange: (v: string) => updatePersonal({ location: v }),
    },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/95">
      {items.map((item) => {
        if (readOnly && !item.value.trim()) return null;
        const Icon = item.icon;
        return (
          <span key={item.placeholder} className="inline-flex min-w-0 items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-white/80" />
            <InlineEditableText
              value={item.value}
              onChange={item.onChange}
              className="text-[11px] text-white"
              placeholder={item.placeholder}
              readOnly={readOnly}
            />
          </span>
        );
      })}
    </div>
  );
}

function LockupPhoto({
  size,
  rounded,
  readOnly,
}: {
  size: number;
  rounded: boolean;
  readOnly: boolean;
}) {
  const { cvData, photoDisplayUrl, updatePersonal, activeLocale } = useCV();
  return (
    <CvPhotoResizableFrame
      src={photoDisplayUrl}
      crop={cvData.personal.photoCrop}
      alt=""
      sizePx={size}
      isSidebar={rounded}
      resizable={!readOnly}
      onSizeChange={(photoSizePx) => updatePersonal({ photoSizePx })}
      placeholder={
        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
          {getSectionTitle('photo', activeLocale)}
        </div>
      }
    />
  );
}

function hasVisible(sections: CvLayoutSection[] | undefined, type: CvLayoutSection['type']): boolean {
  if (!sections) return true;
  const found = sections.find((s) => s.type === type);
  return found ? found.visible : false;
}

/** Full-width accent header for Creatief. The photo sits on the lower edge of the band. */
export function CvBandHeader({
  readOnly,
  accent,
  sections,
}: {
  readOnly: boolean;
  accent: string;
  sections?: CvLayoutSection[];
}) {
  const { cvData } = useCV();
  const showName = hasVisible(sections, 'personal_header');
  const showContact = hasVisible(sections, 'contact');
  const showPhoto = useShowPhoto(readOnly) && hasVisible(sections, 'photo');
  const photoSize = cappedPhotoSize(cvData.personal.photoSizePx, 104, true);
  // Room for the white ring and the frame padding so the portrait stays inside the band box.
  const photoChrome = 20;
  const overlap = showPhoto ? Math.round(photoSize / 2) + photoChrome : 0;

  return (
    <div className="relative shrink-0">
      <div className="px-8 pt-7 text-white" style={{ backgroundColor: accent, paddingBottom: showPhoto ? 18 : 22 }}>
        <div style={{ paddingRight: showPhoto ? photoSize + 20 : 0 }}>
          {showName ? (
            <NameFields
              readOnly={readOnly}
              nameClass="block text-[26px] font-bold leading-tight tracking-tight text-white"
              titleClass="mt-1 block text-sm font-medium text-white/90"
            />
          ) : null}
          {showContact ? <ContactIconRow readOnly={readOnly} /> : null}
        </div>
      </div>
      {showPhoto ? <div style={{ height: overlap }} /> : null}
      {showPhoto ? (
        <div
          className="absolute right-8 z-10"
          style={{ top: `calc(100% - ${photoSize + photoChrome}px)` }}
        >
          <div className="rounded-full bg-white p-1 shadow-sm">
            <LockupPhoto size={photoSize} rounded readOnly={readOnly} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Name, contact line, and photo as one header for Formeel and Tijdlijn. */
export function CvHeaderLockup({
  readOnly,
  accent,
  sections,
}: {
  readOnly: boolean;
  accent: string;
  sections?: CvLayoutSection[];
}) {
  const { templateKey, cvData } = useCV();
  const showName = !sections || hasVisible(sections, 'personal_header');
  const showContact = !sections || hasVisible(sections, 'contact');
  const showPhoto = useShowPhoto(readOnly) && (!sections || hasVisible(sections, 'photo'));
  const timeline = templateKey === 'linear_timeline';
  const photoSize = cappedPhotoSize(cvData.personal.photoSizePx, timeline ? 72 : 84, timeline);

  if (timeline) {
    return (
      <header>
        <div className="mb-2 h-1 w-full" style={{ backgroundColor: accent }} />
        <div className="flex items-center gap-4">
          {showPhoto ? <LockupPhoto size={photoSize} rounded readOnly={readOnly} /> : null}
          <div className="min-w-0 flex-1">
            {showName ? (
              <NameFields
                readOnly={readOnly}
                nameClass="block text-2xl font-bold leading-tight tracking-tight text-gray-900"
                titleClass="mt-0.5 block text-sm text-gray-600"
              />
            ) : null}
            {showContact ? <ContactMiddot readOnly={readOnly} className="text-gray-500" /> : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-start justify-between gap-6 border-b border-gray-300 pb-3">
      <div className="min-w-0 flex-1">
        {showName ? (
          <NameFields
            readOnly={readOnly}
            nameClass="block text-[28px] font-normal leading-tight tracking-tight text-gray-900"
            nameStyle={{ fontFamily: EDITORIAL_SERIF }}
            titleClass="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600"
          />
        ) : null}
        {showContact ? <ContactMiddot readOnly={readOnly} /> : null}
      </div>
      {showPhoto ? <LockupPhoto size={photoSize} rounded={false} readOnly={readOnly} /> : null}
    </header>
  );
}

export function CvContinuationBar({ accent }: { accent: string }) {
  const { cvData } = useCV();
  const name = cvData.personal.fullName.trim();
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b px-6"
      style={{ height: CV_BAND_CONTINUATION_PX, borderColor: accent }}
    >
      {name ? <span className="truncate text-[12px] font-semibold text-gray-900">{name}</span> : null}
      <span className="h-px min-w-[2rem] flex-1" style={{ backgroundColor: accent }} />
    </div>
  );
}
