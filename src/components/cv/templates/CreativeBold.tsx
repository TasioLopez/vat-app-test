'use client';

import { Mail, Phone, MapPin } from 'lucide-react';
import { useCV } from '@/context/CVContext';
import CVA4Canvas from '@/components/cv/CVA4Canvas';
import InlineEditableText from '@/components/cv/InlineEditableText';
import { Plus, X } from 'lucide-react';

/** Full-width header + two columns — “creative bold” */
export default function CreativeBold() {
  const {
    cvData,
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

  return (
    <CVA4Canvas>
      <div
        className="flex min-h-[297mm] flex-col text-[11px] leading-snug"
        style={{ '--cv-accent': accent } as React.CSSProperties}
      >
        <header
          className="px-8 py-6 text-white"
          style={{ backgroundColor: accent }}
        >
          <InlineEditableText
            value={cvData.personal.fullName}
            onChange={(v) => updatePersonal({ fullName: v })}
            as="h1"
            className="block text-3xl font-bold tracking-tight"
            placeholder="Naam"
          />
          <InlineEditableText
            value={cvData.personal.title}
            onChange={(v) => updatePersonal({ title: v })}
            as="p"
            className="mt-2 text-lg text-white/95"
            placeholder="Functietitel"
          />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/95">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 shrink-0" />
              <InlineEditableText
                value={cvData.personal.phone}
                onChange={(v) => updatePersonal({ phone: v })}
                className="text-white"
                placeholder="Telefoon"
              />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 shrink-0" />
              <InlineEditableText
                value={cvData.personal.email}
                onChange={(v) => updatePersonal({ email: v })}
                className="text-white break-all"
                placeholder="E-mail"
              />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              <InlineEditableText
                value={cvData.personal.location}
                onChange={(v) => updatePersonal({ location: v })}
                className="text-white"
                placeholder="Plaats"
              />
            </span>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-2 gap-6 p-6">
          <div className="space-y-5">
            <section>
              <h2
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase"
                style={{ borderColor: accent, color: accent }}
              >
                Profiel
              </h2>
              <InlineEditableText
                value={cvData.profile}
                onChange={setProfile}
                multiline
                className="block w-full text-sm text-gray-700"
                placeholder="Profieltekst…"
              />
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between border-b-2 pb-1" style={{ borderColor: accent }}>
                <h2 className="text-sm font-bold uppercase" style={{ color: accent }}>
                  Werkervaring
                </h2>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                {cvData.experience.map((e) => (
                  <div key={e.id} className="group relative rounded-lg bg-orange-50/40 p-2">
                    <button
                      type="button"
                      onClick={() => removeExperience(e.id)}
                      className="absolute top-1 right-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={e.role}
                      onChange={(v) => updateExperience(e.id, { role: v })}
                      className="block text-sm font-semibold text-gray-900"
                    />
                    <InlineEditableText
                      value={e.description ?? ''}
                      onChange={(v) => updateExperience(e.id, { description: v })}
                      multiline
                      className="mt-1 block w-full text-sm text-gray-700"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between border-b-2 pb-1" style={{ borderColor: accent }}>
                <h2 className="text-sm font-bold uppercase" style={{ color: accent }}>
                  Opleiding
                </h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 print:hidden hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {cvData.education.map((ed) => (
                  <div key={ed.id} className="group relative rounded-lg bg-sky-50/50 p-2">
                    <button
                      type="button"
                      onClick={() => removeEducation(ed.id)}
                      className="absolute top-1 right-1 rounded p-1 text-gray-400 opacity-0 print:hidden group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={ed.institution}
                      onChange={(v) => updateEducation(ed.id, { institution: v })}
                      className="block text-sm font-semibold"
                    />
                    <InlineEditableText
                      value={ed.description ?? ''}
                      onChange={(v) => updateEducation(ed.id, { description: v })}
                      multiline
                      className="mt-1 block w-full text-sm text-gray-700"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section>
              <h2
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase"
                style={{ borderColor: accent, color: accent }}
              >
                Vaardigheden
              </h2>
              <ul className="space-y-1">
                {cvData.skills.map((s) => (
                  <li key={s.id} className="group flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => removeSkill(s.id)}
                      className="mt-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={s.text}
                      onChange={(v) => updateSkill(s.id, v)}
                      className="flex-1 text-sm"
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addSkill}
                className="mt-2 text-xs font-medium text-sky-600 print:hidden hover:underline"
              >
                + Vaardigheid
              </button>
            </section>

            <section>
              <h2
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase"
                style={{ borderColor: accent, color: accent }}
              >
                Talen
              </h2>
              <ul className="space-y-1">
                {cvData.languages.map((l) => (
                  <li key={l.id} className="group flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => removeLanguage(l.id)}
                      className="mt-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={l.language}
                      onChange={(v) => updateLanguage(l.id, { language: v })}
                      className="flex-1 text-sm"
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addLanguage}
                className="mt-2 text-xs font-medium text-sky-600 print:hidden hover:underline"
              >
                + Taal
              </button>
            </section>

            <section>
              <h2
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase"
                style={{ borderColor: accent, color: accent }}
              >
                Interesses
              </h2>
              <ul className="space-y-1">
                {cvData.interests.map((i) => (
                  <li key={i.id} className="group flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => removeInterest(i.id)}
                      className="mt-0.5 text-gray-400 opacity-0 print:hidden group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <InlineEditableText
                      value={i.text}
                      onChange={(v) => updateInterest(i.id, v)}
                      className="flex-1 text-sm"
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addInterest}
                className="mt-2 text-xs font-medium text-sky-600 print:hidden hover:underline"
              >
                + Interesse
              </button>
            </section>

            <section>
              <h2
                className="mb-2 border-b-2 pb-1 text-sm font-bold uppercase"
                style={{ borderColor: accent, color: accent }}
              >
                Overig
              </h2>
              <InlineEditableText
                value={cvData.extra}
                onChange={setExtra}
                multiline
                className="block w-full text-sm text-gray-700"
              />
            </section>
          </div>
        </div>
      </div>
    </CVA4Canvas>
  );
}
