'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUIET_BUTTON_CLASS } from '@/components/employee/detail/shared';

const SKELETON_CARD_CLASS = 'rounded-xl border border-gray-200 bg-white';

/** Placeholder in the shape of the page while the werknemer loads. */
export function EmployeePageSkeleton() {
  return (
    <div role="status" aria-label="Werknemer laden" className="animate-pulse space-y-5">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-6 w-64 max-w-full rounded bg-gray-100" />
            <div className="h-4 w-44 rounded bg-gray-100" />
            <div className="h-4 w-80 max-w-full rounded bg-gray-100" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-5 @4xl/page:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${SKELETON_CARD_CLASS} h-80`} />
        <div className="space-y-5">
          <div className={`${SKELETON_CARD_CLASS} h-52`} />
          <div className={`${SKELETON_CARD_CLASS} h-44`} />
          <div className={`${SKELETON_CARD_CLASS} h-36`} />
        </div>
      </div>
    </div>
  );
}

export function EmployeeNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <h1 className="text-lg font-semibold text-gray-900">Werknemer niet gevonden</h1>
      <p className="mt-1 max-w-sm text-sm text-gray-600">
        Deze werknemer bestaat niet meer, of je hebt geen toegang tot dit dossier.
      </p>
      <Button type="button" variant="outline" className={`${QUIET_BUTTON_CLASS} mt-5`} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Terug naar werknemers
      </Button>
    </div>
  );
}
