'use client';

import { Mail, Phone, MapPin, Plus, X } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import InlineEditableText from '@/components/cv/InlineEditableText';
import InlineEditableList from '@/components/cv/InlineEditableList';

/** Black-and-white corporate layout: minimal chrome, neutral typography */
export default function CorporateMinimal() {
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
        className="flex min-h-[297mm] text-[11px] leading-snug"
        style={{ '--cv-accent': accent } as React.CSSProperties}
      >
        <aside className="flex w-[32%] shrink-0 flex-col gap-4 border-r border-neutral-200 bg-neutral-900 p-5 text-neutral-100 print:bg-neutral-900">
          {showPhoto && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-neutral-600 bg-neutral-800">
                {photoDisplayUrl ? (
                  <img
                    src={photoDisplayUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                    Foto
                  </div>
                )}
              </div>
            </div>
          )}

          <section>
            <h3 className="mb-2 border-b border-neutral-600 pb-1 text-xs font-semibold uppercase tracking-widest text-neutral-300">
              Contact
            </h3>
            <ul className="space-y-2 text-neutral-100">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <InlineEditableText
                  value={cvData.personal.phone}
                  onChange={(v) => updatePersonal({ phone: v })}
                  className="text-[11px] text-neutral-100"
                  placeholder="Telefoon"
                />
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <InlineEditableText
                  value={cvData.personal.email}
                  onChange={(v) => updatePersonal({ email: v })}
                  className="text-[11px] text-neutral-100 break-all"
                  placeholder="E-mail"
                />
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <InlineEditableText
                  value={cvData.personal.location}
                  onChange={(v) => updatePersonal({ location: v })}
                  className="text-[11px] text-neutral-100"
                  placeholder="Plaats"
                />
              </li>
            </ul>
          </section>

          <InlineEditableList
            title="Vaardigheden"
            items={cvData.skills}
            onChange={(id, text) => updateSkill(id, text)}
            onAdd={addSkill}
            onRemove={removeSkill}
            variant="sidebar"
            itemTextClassName="text-sm text-neutral-100"
          />

          <InlineEditableList
            title="Talen"
            items={cvData.languages.map((l) => ({ id: l.id, text: l.language }))}
            onChange={(id, text) => updateLanguage(id, { language: text })}
            onAdd={addLanguage}
            onRemove={removeLanguage}
            variant="sidebar"
            itemTextClassName="text-sm text-neutral-100"
          />

          <InlineEditableList
            title="Interesses"
            items={cvData.interests}
            onChange={(id, text) => updateInterest(id, text)}
            onAdd={addInterest}
            onRemove={removeInterest}
            variant="sidebar"
            itemTextClassName="text-sm text-neutral-100"
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4 bg-white p-6 text-neutral-900">
          <header className="border-b border-neutral-200 pb-3">
            <InlineEditableText
              value={cvData.personal.fullName}
              onChange={(v) => updatePersonal({ fullName: v })}
              as="h1"
              className="block text-2xl font-bold tracking-tight text-neutral-900"
              placeholder="Naam"
            />
            <InlineEditableText
              value={cvData.personal.title}
              onChange={(v) => updatePersonal({ title: v })}
              as="p"
              className="mt-1 text-sm font-medium text-neutral-600"
              placeholder="Functietitel"
            />
          </header>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-800">
              <span className="border-b-2 pb-0.5" style={{ borderColor: accent }}>
                Profiel
              </span>
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
                <span className="border-b-2 pb-0.5" style={{ borderColor: accent }}>
                  Werkervaring
                </span>
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
                <div key={e.id} className="group relative border-l-2 border-neutral-300 pl-3">
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
                <span className="border-b-2 pb-0.5" style={{ borderColor: accent }}>
                  Opleiding
                </span>
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

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-800">
              <span className="border-b-2 pb-0.5" style={{ borderColor: accent }}>
                Overig
              </span>
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
    </CVA4Canvas>
  );
}
