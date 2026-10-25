import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import { validateVgr, visibleIssues } from '@/lib/vgr/validation';
import type { VGRData } from '@/lib/vgr/schema';

function draft(patch: Record<string, unknown> = {}): VGRData {
  return ensureVGRShape({
    first_name: 'Test',
    last_name: 'Werknemer',
    date_of_birth: '1990-01-01',
    first_sick_day: '2025-03-01',
    consultant_name: 'Adviseur',
    document_employer_name: 'Acme',
    fml_izp_lab_kind: 'FML',
    fml_izp_lab_date: '2025-06-01',
    vgr_meta: { period_start: '2026-01-01', period_end: '2026-03-31', report_date: '2026-04-01' },
    body: {
      benutbare_mogelijkheden: { heeft: true },
      praktische_belemmeringen: { aanwezig: false },
      doelstelling_traject: { huidige: 'activering' },
      belastbaarheidsprofiel: { kind: 'fml', datum: '2025-06-01', rubrieken: ['Werktijden'] },
      bijstellingen_belastbaarheid: { aanwezig: false },
      wijzigingen_doelstelling: { aanwezig: false },
      inzet_houding: { werkt_mee: true, toelichting: 'Werknemer komt afspraken na.' },
      pow: { huidige_trede: 3, intake_trede: 3, doel_onbekend: true, history: [{ id: 'p1', date: '2026-04-01', toelichting: 'Ongewijzigd.' }] },
      visie_plaatsbaarheid: { kansen: 'matig' },
    },
    ...patch,
  });
}

describe('validateVgr', () => {
  it('flags FML date equal to first sick day and keeps them distinct otherwise', () => {
    const ok = validateVgr(draft());
    assert.equal(ok.some((i) => i.id === 'gegevens:_:fml-eq-ezd'), false);

    const bad = validateVgr(draft({ first_sick_day: '2025-06-01', fml_izp_lab_date: '2025-06-01' }));
    const hit = bad.find((i) => i.id === 'gegevens:_:fml-eq-ezd');
    assert.ok(hit);
    assert.equal(hit.level, 'warning');
  });

  it('allows an empty application list (activation-only)', () => {
    const issues = validateVgr(draft({ applications: [] }));
    assert.equal(issues.some((i) => i.step === 'applications' && i.level === 'error'), false);
    assert.equal(issues.some((i) => i.id === 'applications:_:wekelijks-zonder-apps'), false);
  });

  it('warns when weekly applications are claimed but the log is empty', () => {
    const data = draft();
    data.body.interventies_activatie.selected = ['wekelijks_solliciteren'];
    const issues = validateVgr(data);
    assert.ok(issues.some((i) => i.id === 'applications:_:wekelijks-zonder-apps'));
  });

  it('does not invent applications and hides dismissed warnings', () => {
    const data = draft();
    data.body.interventies_activatie.selected = ['wekelijks_solliciteren'];
    const issues = validateVgr(data);
    const dismissed = { 'applications:_:wekelijks-zonder-apps': 'Focus ligt op activering; solliciteren start volgende periode.' };
    const visible = visibleIssues(issues, dismissed);
    assert.equal(visible.some((i) => i.id === 'applications:_:wekelijks-zonder-apps'), false);
    assert.ok(visibleIssues(issues, {}).some((i) => i.id === 'applications:_:wekelijks-zonder-apps'));
  });

  it('never dismisses errors', () => {
    const issues = validateVgr(ensureVGRShape({}));
    const errors = issues.filter((i) => i.level === 'error');
    assert.ok(errors.length > 0);
    const dismissed = Object.fromEntries(errors.map((e) => [e.id, 'ignore']));
    const visible = visibleIssues(issues, dismissed);
    assert.ok(visible.filter((i) => i.level === 'error').length === errors.length);
  });
});
