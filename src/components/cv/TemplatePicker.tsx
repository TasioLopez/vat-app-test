'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CvTemplateKey } from '@/types/cv';

type Props = {
  onChoose: (key: CvTemplateKey) => void;
  busy?: boolean;
};

export default function TemplatePicker({ onChoose, busy }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Kies je CV Template</h1>
        <p className="mt-2 text-gray-600">
          Selecteer een professionele template en pas hem aan naar jouw wens
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose('modern_professional')}
          className={cn(
            'group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-md transition-all',
            'hover:border-sky-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          )}
        >
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-sky-50/80">
            <div className="relative h-32 w-24 rounded-lg bg-white shadow-md">
              <div className="absolute left-2 top-2 h-10 w-10 rounded-full bg-gray-200" />
              <div className="absolute left-14 top-4 h-1 w-16 rounded bg-emerald-200" />
              <div className="absolute left-14 top-7 h-1 w-12 rounded bg-sky-200" />
              <div className="absolute left-2 top-20 h-1 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Modern zakelijk</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Klassieke zijbalk voor contact en lijsten, hoofdtekst rechts
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3CC] py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose('creative_bold')}
          className={cn(
            'group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-md transition-all',
            'hover:border-orange-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300'
          )}
        >
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-orange-50/80">
            <div className="relative h-32 w-24 overflow-hidden rounded-lg bg-white shadow-md">
              <div className="h-6 w-full bg-orange-200" />
              <div className="grid grid-cols-2 gap-1 p-2">
                <div className="h-1 rounded bg-emerald-200" />
                <div className="h-1 rounded bg-sky-200" />
                <div className="h-1 rounded bg-emerald-200" />
                <div className="h-1 rounded bg-sky-200" />
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Creatief & opvallend</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Brede kleurenkop en twee kolommen daaronder
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3CC] py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose('corporate_minimal')}
          className={cn(
            'group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-md transition-all',
            'hover:border-neutral-400 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400'
          )}
        >
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-neutral-100">
            <div className="relative h-32 w-24 rounded border border-neutral-300 bg-white shadow-sm">
              <div className="mx-2 mt-2 h-1.5 w-16 rounded bg-neutral-800" />
              <div className="mx-2 mt-1 h-0.5 w-12 rounded bg-neutral-300" />
              <div className="absolute right-2 top-2 h-7 w-7 rounded border border-neutral-300 bg-neutral-100" />
              <div className="absolute bottom-3 left-2 right-2 space-y-1">
                <div className="h-0.5 w-full bg-neutral-300" />
                <div className="h-0.5 w-[80%] bg-neutral-200" />
                <div className="h-0.5 w-[90%] bg-neutral-200" />
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Formeel executive</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Één smalle kolom: kopregel, compacte meta en gestapelde secties
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose('linear_timeline')}
          className={cn(
            'group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-md transition-all',
            'hover:border-teal-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400'
          )}
        >
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-teal-50/80">
            <div className="relative h-32 w-24 rounded-lg border border-teal-200 bg-white shadow-md">
              <div className="mx-2 mt-2 h-1 w-16 rounded bg-teal-300" />
              <div className="absolute bottom-4 left-1/2 top-10 w-px -translate-x-1/2 bg-teal-400" />
              <div className="absolute left-[calc(50%-3px)] top-11 h-2 w-2 rounded-full bg-teal-500" />
              <div className="absolute left-[calc(50%-3px)] top-[3.25rem] h-2 w-2 rounded-full bg-teal-500" />
              <div className="absolute left-[calc(50%-3px)] top-[4.5rem] h-2 w-2 rounded-full bg-teal-500" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Chronologische tijdlijn</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Profiel bovenaan, verticale lijn voor werk en opleiding, lijsten onderaan
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose('balanced_split')}
          className={cn(
            'group flex flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-left shadow-md transition-all',
            'hover:border-indigo-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300'
          )}
        >
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-indigo-50/80">
            <div className="flex h-32 w-28 gap-1 rounded-lg border border-indigo-200 bg-white p-2 shadow-md">
              <div className="flex flex-1 flex-col gap-1 border-r border-indigo-100 pr-1">
                <div className="h-1 w-full rounded bg-indigo-200" />
                <div className="h-1 w-[90%] rounded bg-gray-200" />
                <div className="h-1 w-full rounded bg-gray-200" />
              </div>
              <div className="flex flex-1 flex-col gap-1 pl-1">
                <div className="h-1 w-full rounded bg-amber-200" />
                <div className="h-1 w-full rounded bg-amber-100" />
                <div className="h-1 w-[70%] rounded bg-gray-200" />
              </div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Evenwichtig tweeluik</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Verhaal en tijdlijn links, vaardigheden en overig rechts — echt 50/50
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>
      </div>
    </div>
  );
}
