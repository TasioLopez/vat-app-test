/**
 * Phase 4 — export carriers + WIA_FINAL scaffold.
 * Synth fixtures only (pack T17 / T22; no real PII).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureVGRShape } from '@/lib/vgr/mapping';
import {
  applyWiaFinalScaffold,
  buildVgrReportTimeline,
  detectUnfoundedWiaConsult,
  formatVgrTimelineText,
  getVgrExportCarrier,
  resolveVgrExportFormat,
  scaffoldWiaFinalConcept,
  vgrCoverTitleForType,
  vgrExportFormatSummary,
} from '@/lib/vgr/export';
import {
  applyConceptVgrDefaults,
  conceptVgrReportTypeLabel,
  resolveConceptVgrDefaults,
  VGR_TEMPLATE_VERSION,
} from '@/lib/vgr/lifecycle';

describe('G13 / T17 export carriers (D05 PDF-only)', () => {
  it('PDF carrier is available with house_style_exact', () => {
    const pdf = getVgrExportCarrier('pdf');
    assert.equal(pdf.status, 'available');
    assert.equal(pdf.house_style_exact, true);
    const resolved = resolveVgrExportFormat('pdf');
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.format, 'pdf');
      assert.equal(resolved.house_style_exact, true);
      assert.equal(resolved.template_version, VGR_TEMPLATE_VERSION);
    }
  });

  it('T17: DOCX refuses with missing carrier and never claims huisstijl exact', () => {
    const docx = getVgrExportCarrier('docx');
    assert.equal(docx.status, 'missing');
    assert.equal(docx.house_style_exact, false);
    assert.match(docx.missing_message || '', /DOCX-dragers ontbreken/i);
    assert.match(docx.missing_message || '', /huisstijl exact/i);

    const resolved = resolveVgrExportFormat('docx');
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.code, 'missing_carrier');
      assert.equal(resolved.house_style_exact, false);
      assert.match(resolved.message, /geen vals .*huisstijl exact/i);
    }

    const summary = vgrExportFormatSummary();
    assert.match(summary, /PDF/);
    assert.match(summary, /DOCX/);
  });

  it('unknown formats are unsupported without house_style_exact', () => {
    const resolved = resolveVgrExportFormat('rtf');
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.equal(resolved.house_style_exact, false);
      assert.equal(resolved.code, 'unsupported_format');
    }
  });
});

describe('G12 / T22 WIA_FINAL scaffold', () => {
  function synthPrior(n: number, extras: Record<string, unknown> = {}) {
    return ensureVGRShape({
      vgr_meta: {
        version: n,
        report_type: n === 1 ? 'VGR1' : 'VGR_FOLLOWUP',
        period_start: `2025-${String(n).padStart(2, '0')}-01`,
        period_end: `2025-${String(n).padStart(2, '0')}-28`,
        report_date: `2025-${String(n).padStart(2, '0')}-28`,
        ...((extras.vgr_meta as object) || {}),
      },
      body: {
        visie_plaatsbaarheid: { conclusie: `Conclusie VGR${n}.` },
      },
    });
  }

  it('builds cumulative timeline from 4 prior VGRs (T22)', () => {
    const priors = [1, 2, 3, 4].map((n) => ({
      id: `prior-${n}`,
      data: synthPrior(n),
    }));
    const timeline = buildVgrReportTimeline({ priorReports: priors });
    assert.equal(timeline.length, 4);
    assert.equal(timeline[0].version, 1);
    assert.equal(timeline[3].version, 4);
    assert.equal(timeline[0].report_type, 'VGR1');
    assert.equal(timeline[3].report_type, 'VGR_FOLLOWUP');
    const text = formatVgrTimelineText(timeline);
    assert.match(text, /VGR1/);
    assert.match(text, /Vervolg-VGR/);
  });

  it('scaffolds WIA_FINAL without inventing WIA consult', () => {
    const priors = [1, 2, 3, 4].map((n) => ({ id: `p${n}`, data: synthPrior(n) }));
    const draft = ensureVGRShape({});
    const scaffold = scaffoldWiaFinalConcept({ draft, priorReports: priors });
    assert.equal(scaffold.report_type, 'WIA_FINAL');
    assert.ok(scaffold.version >= 5);
    assert.equal(scaffold.timeline.length, 4);
    assert.equal(scaffold.unfounded_wia_consult, false);

    const { data } = applyWiaFinalScaffold(draft, priors);
    assert.equal(data.vgr_meta.report_type, 'WIA_FINAL');
    assert.equal(data.vgr_meta.prior_vgr_instance_id, 'p4');
    assert.equal(resolveConceptVgrDefaults(data).report_type, 'WIA_FINAL');
    assert.match(conceptVgrReportTypeLabel('WIA_FINAL'), /WIA/);
    assert.equal(vgrCoverTitleForType('WIA_FINAL'), 'WIA / eindrapportage');
  });

  it('T22: flags unfounded WIA-consult claims', () => {
    assert.equal(detectUnfoundedWiaConsult('Er heeft een WIA-consult plaatsgevonden.'), true);
    assert.equal(detectUnfoundedWiaConsult('Nog geen WIA-consult gedaan.'), false);
    assert.equal(detectUnfoundedWiaConsult('Reguliere voortgang zonder keuring.'), false);

    const draft = ensureVGRShape({
      body: {
        visie_plaatsbaarheid: {
          conclusie: 'Het WIA-consult is afgerond volgens de UWV-keuring.',
        },
      },
    });
    const scaffold = scaffoldWiaFinalConcept({
      draft,
      priorReports: [{ id: 'p1', data: synthPrior(1) }],
    });
    assert.equal(scaffold.unfounded_wia_consult, true);
    assert.ok(scaffold.warnings.some((w) => /WIA-consult/i.test(w)));
  });

  it('preserves WIA_FINAL through applyConceptVgrDefaults', () => {
    const applied = applyConceptVgrDefaults(
      ensureVGRShape({
        vgr_meta: { report_type: 'WIA_FINAL', version: 5, prior_vgr_instance_id: 'p4' },
      }),
    );
    assert.equal(applied.vgr_meta.report_type, 'WIA_FINAL');
    assert.ok(applied.vgr_meta.version >= 5);
    assert.equal(applied.vgr_meta.template_version, VGR_TEMPLATE_VERSION);
  });
});

describe('Phase 4 acceptance markers (synth suite subset)', () => {
  it('T01-shaped: first concept defaults to VGR1', () => {
    const d = resolveConceptVgrDefaults(ensureVGRShape({}));
    assert.equal(d.report_type, 'VGR1');
  });

  it('T09-shaped: prior link → FOLLOWUP', () => {
    const d = resolveConceptVgrDefaults(
      ensureVGRShape({ vgr_meta: { prior_vgr_instance_id: 'prev', version: 1 } }),
    );
    assert.equal(d.report_type, 'VGR_FOLLOWUP');
  });

  it('T17 + T22 wired in same export module', () => {
    assert.equal(resolveVgrExportFormat('docx').ok, false);
    assert.equal(scaffoldWiaFinalConcept({ draft: ensureVGRShape({}), priorReports: [] }).report_type, 'WIA_FINAL');
  });
});
