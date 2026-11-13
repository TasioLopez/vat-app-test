'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  buildCvStatusMap,
  resolveBuilderDocStatus,
  summarizeGeneratedDocs,
  type CvStatus,
  type TpStatus,
} from '@/lib/employee/doc-status';

export type BuilderDocState = {
  /** `null` while loading or when the lookup failed. */
  status: TpStatus | null;
  lastExportAt: string | null;
};

export type EmployeeDocStatuses = {
  loading: boolean;
  tp: BuilderDocState;
  intake: BuilderDocState;
  vgr: BuilderDocState;
  cv: { status: CvStatus | null };
};

type InstanceLookup = {
  hasTp: boolean | null;
  hasIntake: boolean | null;
  vgr: { hasInstance: boolean; hasFinal: boolean } | null;
  cv: CvStatus | null;
};

type ExistsResult = { data: { id: string }[] | null; error: unknown };

/** `intake_instances` is not in the generated Supabase types yet. */
type IntakeInstancesClient = {
  from: (table: 'intake_instances') => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { limit: (count: number) => PromiseLike<ExistsResult> };
    };
  };
};

/**
 * Status of the four builder documents for one employee.
 * Drafts come from the instance tables; "completed" comes from the exported PDFs in `documents`.
 */
export function useEmployeeDocStatuses(
  employeeId: string,
  documents: Array<{ type: string | null; uploaded_at: string | null }>
): EmployeeDocStatuses {
  const [lookup, setLookup] = useState<InstanceLookup | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLookup(null);

    void (async () => {
      const [tpRes, intakeRes, vgrRes, cvRes, shareRes] = await Promise.all([
        supabase.from('tp_instances').select('id').eq('employee_id', employeeId).limit(1),
        (supabase as unknown as IntakeInstancesClient)
          .from('intake_instances')
          .select('id')
          .eq('employee_id', employeeId)
          .limit(1),
        supabase.from('vgr_instances').select('id, status').eq('employee_id', employeeId),
        supabase
          .from('cv_documents')
          .select('id, employee_id')
          .eq('employee_id', employeeId)
          .is('parent_cv_id', null),
        supabase
          .from('cv_share_links')
          .select('employee_id, revoked_at, expires_at, last_accessed_at')
          .eq('employee_id', employeeId),
      ]);
      if (cancelled) return;

      if (tpRes.error) console.error('Error fetching tp_instances:', tpRes.error);
      if (intakeRes.error) console.error('Error fetching intake_instances:', intakeRes.error);
      if (vgrRes.error) console.error('Error fetching vgr_instances:', vgrRes.error);
      if (cvRes.error) console.error('Error fetching cv_documents:', cvRes.error);
      if (shareRes.error) console.error('Error fetching cv_share_links:', shareRes.error);

      setLookup({
        hasTp: tpRes.error ? null : (tpRes.data ?? []).length > 0,
        hasIntake: intakeRes.error ? null : (intakeRes.data ?? []).length > 0,
        vgr: vgrRes.error
          ? null
          : {
              hasInstance: (vgrRes.data ?? []).length > 0,
              hasFinal: (vgrRes.data ?? []).some((row) => row.status === 'final'),
            },
        cv:
          cvRes.error || shareRes.error
            ? null
            : buildCvStatusMap(cvRes.data ?? [], shareRes.data ?? []).get(employeeId) ?? 'none',
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return useMemo(() => {
    const exports = summarizeGeneratedDocs(documents);
    const builder = (
      hasInstance: boolean | null | undefined,
      summary: { exportCount: number; lastExportAt: string | null },
      hasFinalInstance = false
    ): BuilderDocState => ({
      status:
        hasInstance === null || hasInstance === undefined
          ? null
          : resolveBuilderDocStatus({
              hasInstance,
              exportCount: summary.exportCount,
              hasFinalInstance,
            }),
      lastExportAt: summary.lastExportAt,
    });

    return {
      loading: lookup === null,
      tp: builder(lookup?.hasTp, exports.tp),
      intake: builder(lookup?.hasIntake, exports.intake),
      vgr: builder(lookup?.vgr?.hasInstance, exports.vgr, lookup?.vgr?.hasFinal ?? false),
      cv: { status: lookup?.cv ?? null },
    };
  }, [lookup, documents]);
}
