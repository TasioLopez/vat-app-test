'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, IdCard, Plus, Copy, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { listCvDocuments, duplicateCvDocument, deleteCvDocument } from '@/lib/cv/service';
import { Button } from '@/components/ui/button';

export default function CVHubClient({
  employeeId,
  employeeLabel,
}: {
  employeeId: string;
  employeeLabel: string;
}) {
  const router = useRouter();
  const [list, setList] = useState<Awaited<ReturnType<typeof listCvDocuments>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCvDocuments(supabase, employeeId);
      setList(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [employeeId]);

  const dup = async (cvId: string) => {
    try {
      const newId = await duplicateCvDocument(supabase, cvId, employeeId);
      router.push(`/dashboard/cv/${employeeId}/${newId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Dupliceren mislukt');
    }
  };

  const del = async (cvId: string) => {
    if (!confirm('Dit CV verwijderen?')) return;
    try {
      await deleteCvDocument(supabase, cvId, employeeId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 gap-1 text-gray-600" asChild>
            <Link href={`/dashboard/employees/${employeeId}`}>
              <ArrowLeft className="h-4 w-4" />
              Terug naar werknemer
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">CV&apos;s</h1>
          <p className="text-gray-600">{employeeLabel}</p>
        </div>
        <Button className="gap-2 bg-[#00A3CC] hover:bg-[#0088aa]" asChild>
          <Link href={`/dashboard/cv/${employeeId}/new`}>
            <Plus className="h-4 w-4" />
            Nieuw CV
          </Link>
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Laden…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <IdCard className="mx-auto h-12 w-12 text-amber-400" />
          <p className="mt-4 text-gray-600">Nog geen CV. Maak er een op basis van het werknemersprofiel.</p>
          <Button className="mt-4 bg-[#00A3CC] hover:bg-[#0088aa]" asChild>
            <Link href={`/dashboard/cv/${employeeId}/new`}>Nieuw CV maken</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/dashboard/cv/${employeeId}/${row.id}`}
                className="min-w-0 flex-1 font-medium text-gray-900 hover:text-sky-700"
              >
                {row.title}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {new Date(row.updated_at).toLocaleString('nl-NL')}
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => dup(row.id)}>
                  <Copy className="h-4 w-4" />
                  Dupliceren
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 hover:bg-red-50"
                  onClick={() => del(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
