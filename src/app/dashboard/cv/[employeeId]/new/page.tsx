'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { createCvDocument } from '@/lib/cv/service';
import TemplatePicker from '@/components/cv/TemplatePicker';
import type { CvTemplateKey } from '@/types/cv';
import { Button } from '@/components/ui/button';

export default function NewCvPage() {
  const params = useParams() as { employeeId: string };
  const router = useRouter();
  const employeeId = params.employeeId;
  const [busy, setBusy] = useState(false);

  const onChoose = async (templateKey: CvTemplateKey) => {
    setBusy(true);
    try {
      const id = await createCvDocument(
        supabase,
        {
          employeeId,
          templateKey,
          title: 'CV',
        },
        undefined
      );
      router.push(`/dashboard/cv/${employeeId}/${id}`);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Aanmaken mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <Button variant="ghost" size="sm" className="gap-1 text-gray-600" asChild>
          <Link href={`/dashboard/cv/${employeeId}`}>
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Link>
        </Button>
      </div>
      <TemplatePicker onChoose={onChoose} busy={busy} />
    </div>
  );
}
