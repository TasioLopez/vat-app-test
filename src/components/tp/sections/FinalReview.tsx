'use client';

import TPPreview from '@/components/tp/TPPreview';
import { ExportButton } from '@/components/tp/ExportButton';

type Props = { employeeId: string };

export default function FinalReview({ employeeId }: Props) {
  return (
    <div className="mx-auto max-w-[900px] p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Final Review</h1>
      <p className="text-sm text-gray-600">
        Bekijk alle onderstaande secties. Klik als u klaar bent op 'Downloaden' om één PDF te exporteren en op te slaan.      </p>

      <TPPreview employeeId={employeeId} />

      <div className="pt-4">
        <ExportButton employeeId={employeeId} />
      </div>
    </div>
  );
}
