export type TpStatus = 'none' | 'draft' | 'completed';
export type CvStatus = 'none' | 'draft' | 'shared' | 'opened';

const TP_RANK: Record<TpStatus, number> = {
  none: 0,
  draft: 1,
  completed: 2,
};

const CV_RANK: Record<CvStatus, number> = {
  none: 0,
  draft: 1,
  shared: 2,
  opened: 3,
};

export function tpStatusRank(status: TpStatus): number {
  return TP_RANK[status];
}

export function cvStatusRank(status: CvStatus): number {
  return CV_RANK[status];
}

export function maxTpStatus(a: TpStatus, b: TpStatus): TpStatus {
  return tpStatusRank(a) >= tpStatusRank(b) ? a : b;
}

export function maxCvStatus(a: CvStatus, b: CvStatus): CvStatus {
  return cvStatusRank(a) >= cvStatusRank(b) ? a : b;
}

/** Split IDs into chunks for PostgREST `.in()` URL limits. */
export function chunkIds<T>(ids: T[], size = 150): T[][] {
  if (ids.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export function isShareLinkActive(row: {
  revoked_at: string | null;
  expires_at: string;
  now?: Date;
}): boolean {
  if (row.revoked_at) return false;
  const now = row.now ?? new Date();
  return new Date(row.expires_at).getTime() > now.getTime();
}

export function buildTpStatusMap(
  instances: Array<{ id: string; employee_id: string }>,
  exportInstanceIds: Set<string>
): Map<string, TpStatus> {
  const map = new Map<string, TpStatus>();
  for (const row of instances) {
    const next: TpStatus = exportInstanceIds.has(row.id) ? 'completed' : 'draft';
    map.set(row.employee_id, maxTpStatus(map.get(row.employee_id) ?? 'none', next));
  }
  return map;
}

/** Documents the app generates from a builder; their PDFs land in `documents` under these types. */
export const GENERATED_DOC_KINDS = ['tp', 'intake', 'vgr'] as const;
export type GeneratedDocKind = (typeof GENERATED_DOC_KINDS)[number];

export type GeneratedDocSummary = {
  exportCount: number;
  lastExportAt: string | null;
};

/** Count exported PDFs per generated document kind and keep the most recent export date. */
export function summarizeGeneratedDocs(
  documents: Array<{ type: string | null; uploaded_at: string | null }>
): Record<GeneratedDocKind, GeneratedDocSummary> {
  const summary: Record<GeneratedDocKind, GeneratedDocSummary> = {
    tp: { exportCount: 0, lastExportAt: null },
    intake: { exportCount: 0, lastExportAt: null },
    vgr: { exportCount: 0, lastExportAt: null },
  };

  for (const doc of documents) {
    const kind = (doc.type || '').toLowerCase().trim();
    if (kind !== 'tp' && kind !== 'intake' && kind !== 'vgr') continue;
    const entry = summary[kind];
    entry.exportCount += 1;
    if (!doc.uploaded_at) continue;
    if (!entry.lastExportAt || new Date(doc.uploaded_at) > new Date(entry.lastExportAt)) {
      entry.lastExportAt = doc.uploaded_at;
    }
  }

  return summary;
}

/** Status of a builder document for one employee: an export or a final instance means completed. */
export function resolveBuilderDocStatus(input: {
  hasInstance: boolean;
  exportCount: number;
  hasFinalInstance?: boolean;
}): TpStatus {
  if (input.exportCount > 0 || input.hasFinalInstance) return 'completed';
  return input.hasInstance ? 'draft' : 'none';
}

export function buildCvStatusMap(
  parentCvs: Array<{ employee_id: string }>,
  shares: Array<{
    employee_id: string;
    revoked_at: string | null;
    expires_at: string;
    last_accessed_at: string | null;
  }>,
  now = new Date()
): Map<string, CvStatus> {
  const map = new Map<string, CvStatus>();

  for (const row of parentCvs) {
    map.set(row.employee_id, maxCvStatus(map.get(row.employee_id) ?? 'none', 'draft'));
  }

  for (const share of shares) {
    if (!isShareLinkActive({ ...share, now })) continue;
    const next: CvStatus = share.last_accessed_at ? 'opened' : 'shared';
    map.set(share.employee_id, maxCvStatus(map.get(share.employee_id) ?? 'none', next));
  }

  return map;
}
