'use client';

import { Mail, Phone, MapPin, Plus, X } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import CvPhotoFrame from '@/components/cv/CvPhotoFrame';
import InlineEditableText from '@/components/cv/InlineEditableText';
import InlineEditableList from '@/components/cv/InlineEditableList';

/** Two balanced columns: narrative left, lists + overig right */
export default function BalancedSplit() {
  const {
    cvData,
    photoDisplayUrl,
    accentColor,
    updatePersonal,
    setProfile,
    setExtra,
    addExperience,
    updateExperience,
    removeExperience,
    addEducation,
    updateEducation,
    removeEducation,
    addSkill,
    updateSkill,
    removeSkill,
    addLanguage,
    updateLanguage,
    removeLanguage,
    addInterest,
    updateInterest,
    removeInterest,
  } = useCV();

  const accent = accentColor;
  const showPhoto = cvData.options?.includePhotoInCv === true;

  return (
    <CVA4Canvas>
      <div
        className="min-h-[297mm] px-6 py-6 text-[11px] leading-snug text-neutral-900"
        style={{ '--cv-accent': accent } as React.CSSProperties}
      >
        <header className="mb-5 flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <InlineEditableText
              value={cvData.personal.fullName}
              onChange={(v) => updatePersonal({ fullName: v })}
              as="h1"
              className="block text-2xl font-bold tracking-tight"
              placeholder="Naam"
            />
            <InlineEditableText
              value={cvData.personal.title}
              onChange={(v) => updatePersonal({ title: v })}
              as="p"
              className="mt-1 text-sm font-medium text-neutral-600"
              placeholder="Functietitel"
            />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--cv-accent)]" />
                <InlineEditableText
                  value={cvData.personal.phone}
                  onChange={(v) => updatePersonal({ phone: v })}
                  placeholder="Telefoon"
                />
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--cv-accent)]" />
                <InlineEditableText
                  value={cvData.personal.email}
                  onChange={(v) => updatePersonal({ email: v })}
                  className="break-all"
                  placeholder="E-mail"
                />
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--cv-accent)]" />
                <InlineEditableText
                  value={cvData.personal.location}
                  onChange={(v) => updatePersonal({ location: v })}
                  placeholder="Plaats"
                />
              </span>
            </div>
          </div>
          {showPhoto ? (
            <CvPhotoFrame
              src={photoDisplayUrl}
              crop={cvData.personal.photoCrop}
              alt=""
              frameClassName="h-24 w-24 shrink-0 rounded-lg border-2 border-neutral-200 bg-neutral-50"
              placeholder={
                <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                  Foto
                </div>
              }
            />
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <div className="flex min-w-0 flex-col gap-5">
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]">
                Profiel
              </h2>
              <InlineEditableText
                value={cvData.profile}
                onChange={setProfile}
                multiline
                className="block w-full text-sm text-neutral-700"
                placeholder="Profieltekst…"
              />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]">
                  Werkervaring
                </h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 print:hidden hover:bg-neutral-50"
                  aria-label="Ervaring toevoegen"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                {cvData.experience.map((e) => (
                  <div key={e.id} className="group relative border-l-2 border-neutral-200 pl-3">
                    <button
                      type="button"
                      onClick={() => removeExperience(e.id)}
                      className="absolute -right-1 -top-1 rounded p-1 text-neutral-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      aria-label="Verwijderen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={e.role}
                      onChange={(v) => updateExperience(e.id, { role: v })}
                      className="block text-sm font-semibold text-neutral-900"
                      placeholder="Functie"
                    />
                    <div className="flex flex-wrap gap-x-3 text-xs text-neutral-500">
                      <InlineEditableText
                        value={e.organization ?? ''}
                        onChange={(v) => updateExperience(e.id, { organization: v })}
                        className="inline min-w-[80px]"
                        placeholder="Organisatie"
                      />
                      <InlineEditableText
                        value={e.period ?? ''}
                        onChange={(v) => updateExperience(e.id, { period: v })}
                        className="inline min-w-[60px]"
                        placeholder="Periode"
                      />
                    </div>
                    <InlineEditableText
                      value={e.description ?? ''}
                      onChange={(v) => updateExperience(e.id, { description: v })}
                      multiline
                      className="mt-1 block w-full text-sm text-neutral-700"
                      placeholder="Omschrijving"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]">
                  Opleiding
                </h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 print:hidden hover:bg-neutral-50"
                  aria-label="Opleiding toevoegen"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {cvData.education.map((ed) => (
                  <div key={ed.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => removeEducation(ed.id)}
                      className="absolute -right-1 -top-1 rounded p-1 text-neutral-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                      aria-label="Verwijderen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={ed.institution}
                      onChange={(v) => updateEducation(ed.id, { institution: v })}
                      className="block text-sm font-semibold text-neutral-900"
                      placeholder="Instelling / opleiding"
                    />
                    <InlineEditableText
                      value={ed.diploma ?? ''}
                      onChange={(v) => updateEducation(ed.id, { diploma: v })}
                      className="block text-xs text-neutral-600"
                      placeholder="Diploma / richting"
                    />
                    <InlineEditableText
                      value={ed.description ?? ''}
                      onChange={(v) => updateEducation(ed.id, { description: v })}
                      multiline
                      className="mt-1 block w-full text-sm text-neutral-700"
                      placeholder="Toelichting"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-5 border-t border-neutral-100 pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0">
            <InlineEditableList
              title="Vaardigheden"
              items={cvData.skills}
              onChange={(id, text) => updateSkill(id, text)}
              onAdd={addSkill}
              onRemove={removeSkill}
              itemTextClassName="text-sm text-neutral-800"
            />
            <InlineEditableList
              title="Talen"
              items={cvData.languages.map((l) => ({ id: l.id, text: l.language }))}
              onChange={(id, text) => updateLanguage(id, { language: text })}
              onAdd={addLanguage}
              onRemove={removeLanguage}
              itemTextClassName="text-sm text-neutral-800"
            />
            <InlineEditableList
              title="Interesses"
              items={cvData.interests}
              onChange={(id, text) => updateInterest(id, text)}
              onAdd={addInterest}
              onRemove={removeInterest}
              itemTextClassName="text-sm text-neutral-800"
            />
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--cv-accent)]">
                Overig
              </h2>
              <InlineEditableText
                value={cvData.extra}
                onChange={setExtra}
                multiline
                className="block w-full text-sm text-neutral-700"
                placeholder="Rijbewijs, beschikbaarheid, …"
              />
            </section>
          </div>
        </div>
      </div>
    </CVA4Canvas>
  );
}
