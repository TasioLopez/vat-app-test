import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUploadHeuristic } from '@/lib/vgr/sources/classify-upload';
import { extractDocumentDateFromText, resolveDocumentDate } from '@/lib/vgr/sources/extract-document-date';
import { mapPackDocTypeToEmployee } from '@/lib/vgr/sources/map-pack-to-employee';
import { pickLatestIdsByType, sortSourcesForSelection } from '@/lib/vgr/sources/selection';
import { ensureVGRShape } from '@/lib/vgr/mapping';

describe('extractDocumentDateFromText', () => {
  it('parses ISO and DMY from filenames', () => {
    assert.equal(extractDocumentDateFromText('AD_2026-03-15.pdf'), '2026-03-15');
    assert.equal(extractDocumentDateFromText('verslag_15-03-2026.docx'), '2026-03-15');
    assert.equal(extractDocumentDateFromText('notulen 3 april 2026.txt'), '2026-04-03');
  });

  it('never treats upload timestamps as document dates', () => {
    assert.equal(extractDocumentDateFromText('2026-03-15T12:00:00.000Z'), null);
  });
});

describe('classifyUploadHeuristic', () => {
  it('classifies dump filenames into app slots and pack types', () => {
    const ad = classifyUploadHeuristic({ filename: 'AD-rapport_2026-02-01.pdf', declaredAppType: 'extra' });
    assert.equal(ad.pack_doc_type, 'AD');
    assert.equal(ad.app_type, 'ad_rapportage');
    assert.equal(ad.document_date, '2026-02-01');

    const cv = classifyUploadHeuristic({ filename: 'Curriculum_Vitae.pdf' });
    assert.equal(cv.pack_doc_type, 'CV');
    assert.equal(cv.app_type, 'cv');

    const notes = classifyUploadHeuristic({ filename: 'gespreksaantekeningen_week12.docx' });
    assert.equal(notes.pack_doc_type, 'GESPREKSAANTEKENINGEN');
    assert.equal(notes.app_type, 'gespreksverslag_vgr');

    const brief = classifyUploadHeuristic({ filename: 'Motivatiebrief_ACME.docx', declaredAppType: 'extra' });
    assert.equal(brief.pack_doc_type, 'MOTIVATIEBRIEF');
    assert.equal(brief.app_type, 'extra');
  });

  it('keeps declared typed slots when not dumping as extra', () => {
    const typed = classifyUploadHeuristic({
      filename: 'scan.pdf',
      declaredAppType: 'spreek_reportage',
    });
    assert.equal(typed.pack_doc_type, 'BA_CONSULT');
    assert.equal(typed.app_type, 'spreek_reportage');
  });
});

describe('mapPackDocTypeToEmployee', () => {
  it('maps medical pack types to fml_izp / spreek slots', () => {
    assert.equal(mapPackDocTypeToEmployee('FML'), 'fml_izp');
    assert.equal(mapPackDocTypeToEmployee('IZP'), 'fml_izp');
    assert.equal(mapPackDocTypeToEmployee('BA_CONSULT'), 'spreek_reportage');
    assert.equal(mapPackDocTypeToEmployee('AD'), 'ad_rapportage');
  });
});

describe('source selection sorting', () => {
  it('prefers document_date over uploaded_at and picks latest per type', () => {
    const docs = [
      {
        id: 'old-ad',
        type: 'ad_rapportage',
        name: 'AD oud.pdf',
        uploaded_at: '2026-11-20T10:00:00Z',
        document_date: '2025-01-01',
      },
      {
        id: 'new-ad',
        type: 'ad_rapportage',
        name: 'AD nieuw.pdf',
        uploaded_at: '2026-11-01T10:00:00Z',
        document_date: '2026-10-01',
      },
      {
        id: 'cv1',
        type: 'cv',
        name: 'cv.pdf',
        uploaded_at: '2026-11-25T10:00:00Z',
        document_date: null,
      },
    ];
    const sorted = sortSourcesForSelection(docs);
    assert.equal(sorted[0]?.id, 'new-ad');
    const latest = pickLatestIdsByType(docs);
    assert.deepEqual(latest.sort(), ['cv1', 'new-ad'].sort());
  });
});

describe('resolveDocumentDate', () => {
  it('prefers explicit then filename', () => {
    assert.equal(
      resolveDocumentDate({ explicit: '2026-05-01', filename: 'AD_2026-01-01.pdf' }),
      '2026-05-01'
    );
    assert.equal(resolveDocumentDate({ filename: 'AD_2026-01-01.pdf' }), '2026-01-01');
  });
});

describe('source_intake meta', () => {
  it('normalizes source_intake on ensureVGRShape', () => {
    const shaped = ensureVGRShape({ vgr_meta: { source_intake: 'existing', source_document_ids: ['a'] } });
    assert.equal(shaped.vgr_meta.source_intake, 'existing');
    assert.deepEqual(shaped.vgr_meta.source_document_ids, ['a']);
    const missing = ensureVGRShape({ vgr_meta: {} });
    assert.equal(missing.vgr_meta.source_intake, undefined);
  });
});
