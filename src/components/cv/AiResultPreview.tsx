'use client';

import type { ComponentType } from 'react';
import type { CvModel } from '@/types/cv';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  ListChecks,
  Languages,
  Heart,
  Info,
} from 'lucide-react';

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">
        <Icon className="h-4 w-4 shrink-0 text-purple-600" aria-hidden />
        {title}
      </div>
      <div className="space-y-1 pl-0.5 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  if (value == null || String(value).trim() === '') return null;
  return (
    <p>
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-900">{String(value).trim()}</span>
    </p>
  );
}

const MAX_BLOCK = 1200;

function clip(s: string, max = MAX_BLOCK) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Human-readable summary of proposed AI CV payload for the confirmation dialog.
 */
export default function AiResultPreview({ data }: { data: CvModel }) {
  const p = data.personal;

  return (
    <div className="max-h-[min(60vh,28rem)] space-y-5 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/80 p-4 pr-2">
      <Section icon={User} title="Persoonlijk">
        <div className="space-y-0.5">
          <Line label="Naam" value={p.fullName} />
          <Line label="Functie" value={p.title} />
          <Line label="E-mail" value={p.email} />
          <Line label="Telefoon" value={p.phone} />
          <Line label="Plaats" value={p.location} />
          <Line label="Geboortedatum" value={p.dateOfBirth} />
        </div>
      </Section>

      {data.profile?.trim() ? (
        <Section icon={FileText} title="Profiel">
          <p className="whitespace-pre-wrap text-gray-800">{clip(data.profile, MAX_BLOCK)}</p>
        </Section>
      ) : null}

      {data.experience.length > 0 ? (
        <Section icon={Briefcase} title="Werkervaring">
          <ul className="list-none space-y-3">
            {data.experience.map((e) => (
              <li key={e.id} className="rounded-md bg-white/80 p-2 shadow-sm">
                <p className="font-medium text-gray-900">{e.role || '—'}</p>
                <Line label="Organisatie" value={e.organization} />
                <Line label="Periode" value={e.period} />
                {e.description?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{clip(e.description, 600)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.education.length > 0 ? (
        <Section icon={GraduationCap} title="Opleiding">
          <ul className="list-none space-y-3">
            {data.education.map((ed) => (
              <li key={ed.id} className="rounded-md bg-white/80 p-2 shadow-sm">
                <p className="font-medium text-gray-900">{ed.institution || '—'}</p>
                <Line label="Diploma / richting" value={ed.diploma} />
                <Line label="Periode" value={ed.period} />
                {ed.description?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{clip(ed.description, 600)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.skills.length > 0 ? (
        <Section icon={ListChecks} title="Vaardigheden">
          <ul className="list-inside list-disc space-y-0.5">
            {data.skills.map((s) => (
              <li key={s.id}>{s.text || '—'}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.languages.length > 0 ? (
        <Section icon={Languages} title="Talen">
          <ul className="list-inside list-disc space-y-0.5">
            {data.languages.map((l) => (
              <li key={l.id}>
                {l.language}
                {l.level ? ` (${l.level})` : ''}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.interests.length > 0 ? (
        <Section icon={Heart} title="Interesses">
          <ul className="list-inside list-disc space-y-0.5">
            {data.interests.map((i) => (
              <li key={i.id}>{i.text || '—'}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.extra?.trim() ? (
        <Section icon={Info} title="Overig">
          <p className="whitespace-pre-wrap text-gray-800">{clip(data.extra, MAX_BLOCK)}</p>
        </Section>
      ) : null}
    </div>
  );
}
