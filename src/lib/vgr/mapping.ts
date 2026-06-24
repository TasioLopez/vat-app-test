import { normalizePersonName } from '@/lib/utils';
import type {
  VGRBijlage2Model,
  VGRBijlage2PowTrede,
  VGRBijlage3Decision,
  VGRBijlageChecklistRow,
} from '@/lib/vgr/schema';
import { createOfficialBijlage2Model } from '@/lib/vgr/bijlage2-official';
import { createOfficialBijlage3Decisions } from '@/lib/vgr/bijlage3-official';

const bijlage2Default: VGRBijlage2Model = createOfficialBijlage2Model();

function normChecklistLabel(label: string): string {
  return String(label || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u2019/g, "'");
}

const BIJLAGE2_CHECKLIST_LEGACY: Record<string, string> = {
  'Opstellen verzorgd cv': 'Opstellen verzorgd c.v.',
  '(Werk)ervaring via spoor 1': '(Werk)ervaring opgedaan via Spoor 1',
  '(Werk)ervaring via stage/WEP': '(Werk)ervaring opgedaan via een werkervaringsplaats/ stage (WEP)',
  'Jobhunting/actieve bemiddeling': 'Jobhunting/ actieve bemiddeling',
};

function canonicalChecklistLabel(label: string): string {
  const n = normChecklistLabel(label);
  const mapped = BIJLAGE2_CHECKLIST_LEGACY[n];
  return mapped ? normChecklistLabel(mapped) : n;
}

function mergeChecklistGroup(
  defaults: VGRBijlageChecklistRow[],
  saved: unknown
): VGRBijlageChecklistRow[] {
  const savedArr = Array.isArray(saved) ? saved : [];
  const checkedByCanonical = new Map<string, boolean>();
  for (const row of savedArr) {
    if (!row || typeof row !== 'object' || typeof (row as { label?: unknown }).label !== 'string') continue;
    const r = row as VGRBijlageChecklistRow;
    const key = canonicalChecklistLabel(r.label);
    checkedByCanonical.set(key, checkedByCanonical.get(key) || Boolean(r.checked));
  }
  return defaults.map((d) => ({
    label: d.label,
    checked: checkedByCanonical.get(normChecklistLabel(d.label)) ?? false,
  }));
}

function isLegacyPowPlaceholder(row: Record<string, unknown>): boolean {
  const raw = row.criteria ?? row.checks;
  if (!Array.isArray(raw) || raw.length !== 1) return false;
  const first = raw[0] as { label?: unknown };
  return typeof first?.label === 'string' && /behaald/i.test(first.label);
}

function normalizePowTredes(savedPow: unknown): VGRBijlage2PowTrede[] {
  const defaults = createOfficialBijlage2Model().powTredes;
  if (!Array.isArray(savedPow)) return defaults;

  const savedRows = savedPow
    .filter((x) => x && typeof x === 'object')
    .map((x) => x as Record<string, unknown>);

  return defaults.map((def) => {
    const tredeNum = def.trede;
    const saved = savedRows.find((r) => Number(r.trede) === tredeNum);
    if (!saved) return def;
    if (isLegacyPowPlaceholder(saved)) return def;

    const src = (saved.criteria ?? saved.checks) as unknown;
    if (!Array.isArray(src)) return def;

    const checkedByLabel = new Map<string, boolean>();
    for (const c of src) {
      if (!c || typeof c !== 'object' || typeof (c as { label?: unknown }).label !== 'string') continue;
      const cr = c as VGRBijlageChecklistRow;
      checkedByLabel.set(normChecklistLabel(cr.label), Boolean(cr.checked));
    }

    return {
      trede: tredeNum,
      criteria: def.criteria.map((cr) => ({
        label: cr.label,
        checked: checkedByLabel.get(normChecklistLabel(cr.label)) ?? false,
      })),
    };
  });
}

export function normalizeBijlage2Model(raw: unknown): VGRBijlage2Model {
  const base = createOfficialBijlage2Model();
  if (!raw || typeof raw !== 'object') return base;

  const m = raw as Record<string, unknown>;
  return {
    willen: mergeChecklistGroup(base.willen, m.willen),
    weten: mergeChecklistGroup(base.weten, m.weten),
    kunnen: mergeChecklistGroup(base.kunnen, m.kunnen),
    doen: mergeChecklistGroup(base.doen, m.doen),
    powTredes: normalizePowTredes(m.powTredes),
  };
}

export function normalizeBijlage3Decisions(raw: unknown): VGRBijlage3Decision[] {
  const defaults = createOfficialBijlage3Decisions();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;

  return defaults.map((def, idx) => {
    const arr = raw as Record<string, unknown>[];
    const byId = arr.find((x) => x && typeof x === 'object' && String((x as { id?: unknown }).id) === def.id);
    const saved = (byId ?? arr[idx]) as Record<string, unknown> | undefined;
    if (!saved || typeof saved !== 'object') {
      return { ...def };
    }
    const r = saved.reached;
    const reached = r === 'yes' || r === 'no' ? r : null;
    return {
      ...def,
      reached,
      doelJa: Boolean(saved.doelJa),
      doelNee: Boolean(saved.doelNee),
    };
  });
}

export function normalizeBijlage3Page2(raw: unknown): { doelJa: boolean; doelNee: boolean } {
  if (!raw || typeof raw !== 'object') return { doelJa: false, doelNee: false };
  const o = raw as Record<string, unknown>;
  return { doelJa: Boolean(o.doelJa), doelNee: Boolean(o.doelNee) };
}

export function ensureVGRShape(raw: Record<string, any>): Record<string, any> {
  const next = { ...raw };

  if (typeof next.first_name === 'string') {
    next.first_name = normalizePersonName(next.first_name) ?? '';
  }
  if (typeof next.last_name === 'string') {
    next.last_name = normalizePersonName(next.last_name) ?? '';
  }

  if (!next.bijlage2_model || typeof next.bijlage2_model !== 'object') {
    next.bijlage2_model = bijlage2Default;
  } else {
    next.bijlage2_model = normalizeBijlage2Model(next.bijlage2_model);
  }

  if (!Array.isArray(next.bijlage3_decisions) || next.bijlage3_decisions.length === 0) {
    next.bijlage3_decisions = createOfficialBijlage3Decisions();
  } else {
    next.bijlage3_decisions = normalizeBijlage3Decisions(next.bijlage3_decisions);
  }
  next.bijlage3_page2 = normalizeBijlage3Page2(next.bijlage3_page2);

  return next;
}

export function vgrBijlagenAreEmpty(data: Record<string, unknown>): boolean {
  const model = data.bijlage2_model;
  const decisions = data.bijlage3_decisions;
  const hasModel = model && typeof model === 'object';
  const hasDecisions = Array.isArray(decisions) && decisions.length > 0;
  if (!hasModel && !hasDecisions) return true;
  if (hasModel) {
    const m = model as VGRBijlage2Model;
    const anyChecked = [...m.willen, ...m.weten, ...m.kunnen, ...m.doen].some((r) => r.checked);
    const anyPow = m.powTredes?.some((t) => t.criteria.some((c) => c.checked));
    if (anyChecked || anyPow) return false;
  }
  if (hasDecisions) {
    const anyReached = (decisions as VGRBijlage3Decision[]).some(
      (d) => d.reached === 'yes' || d.reached === 'no' || d.doelJa || d.doelNee
    );
    if (anyReached) return false;
  }
  const page2 = data.bijlage3_page2 as { doelJa?: boolean; doelNee?: boolean } | undefined;
  if (page2?.doelJa || page2?.doelNee) return false;
  return true;
}
