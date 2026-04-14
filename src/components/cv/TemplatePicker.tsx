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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Kies je CV Template</h1>
        <p className="mt-2 text-gray-600">
          Selecteer een professionele template en pas hem aan naar jouw wens
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
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
          <h2 className="text-lg font-bold text-gray-900">Modern Professional</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Strak en professioneel design met foto-sectie en moderne layout
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
          <h2 className="text-lg font-bold text-gray-900">Creative Bold</h2>
          <p className="mt-2 flex-1 text-sm text-gray-600">
            Creatief two-column design met kleuraccenten en moderne uitstraling
          </p>
          <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3CC] py-3 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            Kies deze template
          </span>
        </button>
      </div>
    </div>
  );
}
