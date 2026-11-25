import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocument } from '@/lib/vgr/dossier/classify';
import { extractAssertionsFromSource } from '@/lib/vgr/dossier/extract';
import { mapEmployeeDocTypeToDossier, isMedicalLeadDocType } from '@/lib/vgr/dossier/map-doc-type';
import { mergeDossierUpdate, verifiedFactsForWrite } from '@/lib/vgr/dossier/merge';
import { ensureVgrDossier } from '@/lib/vgr/dossier/normalize';
import { verifyQuoteInSource } from '@/lib/vgr/dossier/quote-verify';
import { emptyVgrDossier } from '@/lib/vgr/dossier/types';
import { formatVerifiedFactsForPrompt } from '@/lib/vgr/dossier/verified-facts-text';
import { proposeApplicationsFromActivities, activityOverstatesExecution } from '@/lib/vgr/dossier/applications-sync';

describe('mapEmployeeDocTypeToDossier (G3)', () => {
  it('maps app types and filename heuristics', () => {
    assert.equal(mapEmployeeDocTypeToDossier('ad_rapportage'), 'AD');
    assert.equal(mapEmployeeDocTypeToDossier('fml_izp'), 'FML');
    assert.equal(mapEmployeeDocTypeToDossier('spreek_reportage'), 'BA_CONSULT');
    assert.equal(mapEmployeeDocTypeToDossier('extra', 'Motivatiebrief_ACME.docx'), 'MOTIVATIEBRIEF');
    assert.equal(mapEmployeeDocTypeToDossier('extra', 'mail-werkgever.eml'), 'EMAIL');
    assert.equal(mapEmployeeDocTypeToDossier('extra', 'persoonlijkheidstest.pdf'), 'TEST');
    assert.equal(isMedicalLeadDocType('BA_CONSULT'), true);
    assert.equal(isMedicalLeadDocType('AD'), false);
  });
});

describe('classify + quarantine (G8)', () => {
  it('quarantines mismatch sources', () => {
    const src = classifyDocument({
      employeeId: 'emp1',
      documentId: 'd1',
      appType: 'cv',
      filename: 'cv.pdf',
      employeeMatchHint: 'mismatch',
    });
    assert.equal(src.quarantined, true);
    assert.equal(src.doc_type, 'CV');
  });
});

describe('extract honesty T06/T13', () => {
  it('T06: motivatiebrief without send proof stays draft/not sent', () => {
    const source = classifyDocument({
      employeeId: 'emp1',
      documentId: 'd2',
      appType: 'extra',
      filename: 'motivatiebrief.docx',
    });
    assert.equal(source.doc_type, 'MOTIVATIEBRIEF');
    const { activities } = extractAssertionsFromSource({
      source,
      text: 'Hierbij de motivatiebrief. Opgesteld door werknemer.',
    });
    assert.equal(activities[0]?.application_status, 'draft');
    assert.notEqual(activities[0]?.application_status, 'sent');
  });

  it('T13: planned next-phase language yields planned activity', () => {
    const source = classifyDocument({
      employeeId: 'emp1',
      documentId: 'd3',
      appType: 'gespreksverslag_vgr',
      filename: 'gesprek.pdf',
    });
    const { activities } = extractAssertionsFromSource({
      source,
      text: 'Sollicitatietraining is gepland voor de volgende fase.',
    });
    assert.ok(activities.some((a) => a.activity_status === 'planned'));
  });
});

describe('quote verify T05', () => {
  it('requires exact substring; keeps typos', () => {
    const src = 'Belastbaarhijd is toegenomen!!! Zie FML.';
    assert.equal(verifyQuoteInSource('Belastbaarhijd is toegenomen!!!', src), 'exact_verified');
    assert.equal(verifyQuoteInSource('Belastbaarheid is toegenomen!!!', src), 'unverified');
  });
});

describe('merge + verified facts', () => {
  it('keeps conflicts and excludes quarantined from write set', () => {
    let dossier = emptyVgrDossier('emp1');
    const bad = classifyDocument({
      employeeId: 'emp1',
      documentId: 'qx',
      appType: 'cv',
      filename: 'other.pdf',
      employeeMatchHint: 'mismatch',
    });
    dossier = mergeDossierUpdate({ dossier, sources: [bad] });
    assert.ok(dossier.issues.some((i) => i.issue_type === 'wrong_employee'));

    const goodSource = classifyDocument({
      employeeId: 'emp1',
      documentId: 'ok',
      appType: 'spreek_reportage',
      filename: 'spreekuur.pdf',
    });
    dossier = mergeDossierUpdate({
      dossier,
      sources: [goodSource],
      assertions: [
        {
          claim_id: 'c1',
          field_key: 'benutbare_mogelijkheden.prognose',
          value: 'Herstel op korte termijn.',
          status: 'known',
          basis: 'explicit_source',
          asserted_by: 'professional',
          source_date: '2026-09-22',
          effective_from: '2026-09-22',
          evidence: [
            {
              source_id: goodSource.source_id,
              source_anchor: 'p.1',
              evidence_excerpt: 'Herstel op korte termijn.',
              quote_verification: 'exact_verified',
            },
          ],
          approval: 'proposed',
        },
        {
          claim_id: 'c2',
          field_key: 'benutbare_mogelijkheden.prognose',
          value: 'Geen herstel verwacht.',
          status: 'known',
          basis: 'explicit_source',
          asserted_by: 'professional',
          source_date: '2026-10-01',
          effective_from: '2026-10-01',
          evidence: [
            {
              source_id: goodSource.source_id,
              source_anchor: 'p.2',
              evidence_excerpt: 'Geen herstel verwacht.',
              quote_verification: 'exact_verified',
            },
          ],
          approval: 'proposed',
        },
      ],
    });
    assert.ok(dossier.assertions.some((a) => a.status === 'conflict'));
    const { facts } = verifiedFactsForWrite(dossier);
    // Conflicts are not "known" write-ready
    assert.ok(facts.every((f) => f.status === 'known'));
    assert.match(formatVerifiedFactsForPrompt(dossier), /Geverifieerde dossierfeiten/);
  });

  it('ensureVgrDossier round-trips', () => {
    const d = ensureVgrDossier({ employee_id: 'e', assertions: [] }, 'e');
    assert.equal(d.schema_version, '0.1-draft');
    assert.equal(d.employee_id, 'e');
  });
});

describe('applications sync G5', () => {
  it('does not propose draft/ready letters as Bijlage 2 rows', () => {
    const rows = proposeApplicationsFromActivities([
      {
        activity_id: 'a1',
        activity_type: 'letter_work',
        activity_status: 'partially_completed',
        activity_date: '2026-09-01',
        application_status: 'draft',
        organization: 'ACME',
        position_or_purpose: 'Motivatiebrief',
        track: 'spoor2',
        claim_ids: [],
        evidence: [],
      },
      {
        activity_id: 'a2',
        activity_type: 'application',
        activity_status: 'completed',
        activity_date: '2026-09-10',
        application_status: 'sent',
        organization: 'Beta BV',
        position_or_purpose: 'Magazijnmedewerker',
        track: 'spoor2',
        claim_ids: [],
        evidence: [],
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].organisatie, 'Beta BV');
    assert.equal(
      activityOverstatesExecution({
        activity_id: 'x',
        activity_type: 'application',
        activity_status: 'planned',
        activity_date: null,
        application_status: 'sent',
        track: 'spoor2',
        claim_ids: [],
        evidence: [],
      }),
      true,
    );
  });
});
