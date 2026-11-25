/**
 * Phase 3 editor lifecycle: manual_lock, impact regen, feedback gate, Concept-VGR, finalize audit.
 * Synth fixtures — pack T10 / T18 / T19 / T20.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import {
  applyConceptVgrDefaults,
  applyStatusWithAudit,
  classifyModuleFeedback,
  collisionModuleIds,
  computeImpactedModules,
  evaluateFinalizeGates,
  filterPatchForLocks,
  isModuleLocked,
  regenerableModuleIds,
  resolveConceptVgrDefaults,
  setModuleLock,
  VGR_TEMPLATE_VERSION,
} from '@/lib/vgr/lifecycle';
import { VGR_APPROVED_RULES_VERSION } from '@/lib/vgr/ai/style-prompt';

describe('G9 manual_lock (T10)', () => {
  it('locks survive and filter AI patches', () => {
    let data = ensureVGRShape({
      body: { pow: { huidige_trede: 3, history: [{ id: 'h1', date: '2026-10-01', toelichting: 'Handmatig' }] } },
    });
    data = {
      ...data,
      module_locks: setModuleLock({}, 'pow', true, 'coach approved'),
    };
    assert.equal(isModuleLocked(data, 'pow'), true);
    const { patch, skippedLocked } = filterPatchForLocks(data, {
      pow: { huidige_trede: 5 as const, history: [] },
      zoekprofiel: { tekst: 'nieuw' },
    });
    assert.deepEqual(skippedLocked, ['pow']);
    assert.equal((patch as { zoekprofiel?: { tekst?: string } }).zoekprofiel?.tekst, 'nieuw');
    assert.equal((patch as { pow?: unknown }).pow, undefined);
  });

  it('impact regen flags collision on locked PoW (T10)', () => {
    const data = ensureVGRShape({
      module_locks: { pow: { locked: true, locked_at: '2026-11-01T00:00:00Z' } },
    });
    const impact = computeImpactedModules({
      data,
      changedClaims: [
        {
          claim_id: 'c1',
          field_key: 'pow.huidige_trede',
          source_ids: ['src_gesprek'],
        },
      ],
    });
    assert.ok(impact.impacted_module_ids.includes('pow'));
    assert.deepEqual(collisionModuleIds(impact), ['pow']);
    assert.deepEqual(regenerableModuleIds(impact), []);
    const hit = impact.hits.find((h) => h.module_id === 'pow');
    assert.equal(hit?.manual_override_collision, true);
    assert.equal(hit?.required_human_review, true);
  });
});

describe('EDIT_MODULE_WITH_FEEDBACK (T18/T19)', () => {
  it('T18: style-only feedback does not require fact review', () => {
    const gate = classifyModuleFeedback('Maak de toon korter, zonder feiten te schrappen');
    assert.equal(gate.kind, 'style');
    assert.equal(gate.requires_fact_review, false);
  });

  it('T19: fact claim requires confirmation', () => {
    const gate = classifyModuleFeedback('de brief is verstuurd');
    assert.equal(gate.kind, 'fact');
    assert.equal(gate.requires_fact_review, true);
    assert.ok(gate.confirmation_question);
  });
});

describe('G11 Concept-VGR defaults', () => {
  it('sets VGR1 vs FOLLOWUP from prior link', () => {
    const first = resolveConceptVgrDefaults(ensureVGRShape({}));
    assert.equal(first.report_type, 'VGR1');
    assert.equal(first.version, 1);

    const follow = resolveConceptVgrDefaults(
      ensureVGRShape({
        vgr_meta: { prior_vgr_instance_id: 'prior-1', version: 1 },
      }),
    );
    assert.equal(follow.report_type, 'VGR_FOLLOWUP');
    assert.ok(follow.version >= 2);

    const applied = applyConceptVgrDefaults(
      ensureVGRShape({
        vgr_meta: { prior_vgr_instance_id: 'prior-1' },
      }),
    );
    assert.equal(applied.vgr_meta.report_type, 'VGR_FOLLOWUP');
    assert.equal(applied.vgr_meta.approved_rules_version, VGR_APPROVED_RULES_VERSION);
    assert.equal(applied.vgr_meta.template_version, VGR_TEMPLATE_VERSION);
  });
});

describe('Finalize audit (T20)', () => {
  it('blocks final when errors remain; stamps audit when clear', () => {
    const incomplete = ensureVGRShape({});
    const blocked = applyStatusWithAudit(incomplete, 'final');
    assert.equal(blocked.gate.ok, false);
    assert.ok(blocked.gate.blockers.length > 0);
    assert.equal(blocked.data.vgr_meta.finalize_audit, null);

    const ready = ensureVGRShape({
      first_name: 'Ada',
      last_name: 'Tester',
      date_of_birth: '1990-01-01',
      first_sick_day: '2025-01-01',
      consultant_name: 'Coach',
      document_employer_name: 'Acme',
      vgr_meta: {
        period_start: '2026-09-01',
        period_end: '2026-10-28',
        report_date: '2026-10-28',
        source_document_ids: ['d1'],
      },
      body: {
        benutbare_mogelijkheden: { heeft: true },
        praktische_belemmeringen: { aanwezig: false },
        doelstelling_traject: { huidige: 'arbeidsmarkt_orientatie', bij_intake: 'arbeidsmarkt_orientatie' },
        belastbaarheidsprofiel: { kind: 'fml', datum: '2025-06-01', rubrieken: ['Werktijden'], toelichting: 'ok' },
        bijstellingen_belastbaarheid: { aanwezig: false },
        wijzigingen_doelstelling: { aanwezig: false },
        inzet_houding: { werkt_mee: true, toelichting: 'Werkt mee.' },
        pow: {
          huidige_trede: 2,
          intake_trede: 1,
          doel_trede: 3,
          confirmed: true,
          history: [{ id: 'h1', date: '2026-10-28', toelichting: 'Trede 2' }],
        },
        visie_plaatsbaarheid: { kansen: 'matig', conclusie: 'Matige kansen.', functies: [] },
      },
      module_locks: { pow: { locked: true, locked_at: '2026-11-01T00:00:00Z' } },
    });

    const gate = evaluateFinalizeGates(ready);
    assert.equal(gate.ok, true, gate.blockers.join(' | '));

    const { data: finalized, gate: g2 } = applyStatusWithAudit(ready, 'final', { userId: 'user-1' });
    assert.equal(g2.ok, true);
    assert.ok(finalized.vgr_meta.finalize_audit);
    assert.equal(finalized.vgr_meta.finalize_audit?.approved_rules_version, VGR_APPROVED_RULES_VERSION);
    assert.equal(finalized.vgr_meta.finalize_audit?.template_version, VGR_TEMPLATE_VERSION);
    assert.ok(finalized.vgr_meta.finalize_audit?.locked_module_ids.includes('pow'));
    assert.ok(finalized.vgr_meta.approved_at);
  });

  it('clears audit when reverting to draft', () => {
    const data = ensureVGRShape({
      first_name: 'Ada',
      last_name: 'Tester',
      date_of_birth: '1990-01-01',
      first_sick_day: '2025-01-01',
      consultant_name: 'Coach',
      document_employer_name: 'Acme',
      vgr_meta: {
        period_start: '2026-09-01',
        period_end: '2026-10-28',
        report_date: '2026-10-28',
        approved_at: '2026-11-01T00:00:00Z',
        finalize_audit: {
          finalized_at: '2026-11-01T00:00:00Z',
          finalized_by: 'u',
          approved_rules_version: 'x',
          template_version: 'y',
          report_type: 'VGR1',
          source_document_ids: [],
          locked_module_ids: [],
          dismissed_warning_ids: [],
          fact_snapshot: null,
        },
      },
    });
    const { data: draft } = applyStatusWithAudit(data, 'draft');
    assert.equal(draft.vgr_meta.finalize_audit, null);
    assert.equal(draft.vgr_meta.approved_at, null);
  });
});

describe('FML doc impact mapping', () => {
  it('new FML impacts belastbaarheid + zoekprofiel', () => {
    const impact = computeImpactedModules({
      data: ensureVGRShape({}),
      newDocTypes: [{ doc_type: 'FML', source_id: 'fml1' }],
    });
    assert.ok(impact.impacted_module_ids.includes('zoekprofiel'));
    assert.ok(impact.impacted_module_ids.includes('belastbaarheidsprofiel'));
  });
});
