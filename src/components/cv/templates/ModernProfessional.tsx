'use client';

import { Mail, Phone, MapPin, Plus, X } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import CvPhotoFrame from '@/components/cv/CvPhotoFrame';
import InlineEditableText from '@/components/cv/InlineEditableText';
import InlineEditableList from '@/components/cv/InlineEditableList';

/** Sidebar + main column — matches “template 1” style */
export default function ModernProfessional() {
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
        {/* Sidebar */}
        <aside
          className="flex w-[32%] shrink-0 flex-col gap-4 p-5 text-white print:bg-[var(--cv-accent)]"
          style={{ backgroundColor: accent }}
        >
          {showPhoto && (
            <div className="flex flex-col items-center gap-2">
              <CvPhotoFrame
                src={photoDisplayUrl}
                crop={cvData.personal.photoCrop}
                alt=""
                frameClassName="h-24 w-24 shrink-0 rounded-full border-4 border-white/40 bg-white/20"
                placeholder={
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/80">
                    Foto
                  </div>
                }
              />
            </div>
          )}

          <section>
            <h3 className="mb-2 border-b border-white/30 pb-1 text-xs font-semibold uppercase tracking-wide">
              Contact
            </h3>
            <ul className="space-y-2 text-white/95">
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" />
                <InlineEditableText
                  value={cvData.personal.phone}
                  onChange={(v) => updatePersonal({ phone: v })}
                  className="text-[11px] text-white"
                  placeholder="Telefoon"
                />
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" />
                <InlineEditableText
                  value={cvData.personal.email}
                  onChange={(v) => updatePersonal({ email: v })}
                  className="text-[11px] text-white break-all"
                  placeholder="E-mail"
                />
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" />
                <InlineEditableText
                  value={cvData.personal.location}
                  onChange={(v) => updatePersonal({ location: v })}
                  className="text-[11px] text-white"
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
            itemTextClassName="text-sm text-white"
          />

          <InlineEditableList
            title="Talen"
            items={cvData.languages.map((l) => ({ id: l.id, text: l.language }))}
            onChange={(id, text) => updateLanguage(id, { language: text })}
            onAdd={addLanguage}
            onRemove={removeLanguage}
            variant="sidebar"
            itemTextClassName="text-sm text-white"
          />

          <InlineEditableList
            title="Interesses"
            items={cvData.interests}
            onChange={(id, text) => updateInterest(id, text)}
            onAdd={addInterest}
            onRemove={removeInterest}
            variant="sidebar"
            itemTextClassName="text-sm text-white"
          />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 bg-white p-6 text-gray-900">
          <header className="border-b border-gray-200 pb-3">
            <InlineEditableText
              value={cvData.personal.fullName}
              onChange={(v) => updatePersonal({ fullName: v })}
              as="h1"
              className="block text-2xl font-bold tracking-tight text-gray-900"
              placeholder="Naam"
            />
            <InlineEditableText
              value={cvData.personal.title}
              onChange={(v) => updatePersonal({ title: v })}
              as="p"
              className="mt-1 text-sm font-medium text-gray-600"
              placeholder="Functietitel"
            />
          </header>

          <section>
            <h2
              className="mb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: accent }}
            >
              Profiel
            </h2>
            <InlineEditableText
              value={cvData.profile}
              onChange={setProfile}
              multiline
              className="block w-full text-sm text-gray-700"
              placeholder="Korte profieltekst…"
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: accent }}
              >
                Werkervaring
              </h2>
              <button
                type="button"
                onClick={addExperience}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
                aria-label="Ervaring toevoegen"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {cvData.experience.map((e) => (
                <div key={e.id} className="group relative border-l-2 border-gray-200 pl-3">
                  <button
                    type="button"
                    onClick={() => removeExperience(e.id)}
                    className="absolute -right-1 -top-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    aria-label="Verwijderen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <InlineEditableText
                    value={e.role}
                    onChange={(v) => updateExperience(e.id, { role: v })}
                    className="block text-sm font-semibold text-gray-900"
                    placeholder="Functie"
                  />
                  <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
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
                    className="mt-1 block w-full text-sm text-gray-700"
                    placeholder="Omschrijving"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: accent }}
              >
                Opleiding
              </h2>
              <button
                type="button"
                onClick={addEducation}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
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
                    className="absolute -right-1 -top-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    aria-label="Verwijderen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <InlineEditableText
                    value={ed.institution}
                    onChange={(v) => updateEducation(ed.id, { institution: v })}
                    className="block text-sm font-semibold text-gray-900"
                    placeholder="Instelling / opleiding"
                  />
                  <InlineEditableText
                    value={ed.diploma ?? ''}
                    onChange={(v) => updateEducation(ed.id, { diploma: v })}
                    className="block text-xs text-gray-600"
                    placeholder="Diploma / richting"
                  />
                  <InlineEditableText
                    value={ed.description ?? ''}
                    onChange={(v) => updateEducation(ed.id, { description: v })}
                    multiline
                    className="mt-1 block w-full text-sm text-gray-700"
                    placeholder="Toelichting"
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2
              className="mb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: accent }}
            >
              Overig
            </h2>
            <InlineEditableText
              value={cvData.extra}
              onChange={setExtra}
              multiline
              className="block w-full text-sm text-gray-700"
              placeholder="Rijbewijs, beschikbaarheid, …"
            />
          </section>
        </div>
      </div>
    </CVA4Canvas>
  );
}
