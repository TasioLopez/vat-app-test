import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  inferBelastbaarheidsdocumentType,
  parseDutchOrIsoDate,
  resolveLeadingBelastbaarheidsdoc,
} from '../resolve-leading-belastbaarheidsdoc';

describe('inferBelastbaarheidsdocumentType', () => {
  it('detects fml, izp, lab from type labels', () => {
    assert.equal(inferBelastbaarheidsdocumentType('fml'), 'fml');
    assert.equal(inferBelastbaarheidsdocumentType('Inzetbaarheidsprofiel'), 'izp');
    assert.equal(inferBelastbaarheidsdocumentType('lab_document'), 'lab');
    assert.equal(inferBelastbaarheidsdocumentType('intake'), null);
  });

  it('treats combined fml_izp upload bucket as ambiguous (not izp)', () => {
    assert.equal(inferBelastbaarheidsdocumentType('fml_izp'), null);
    assert.equal(inferBelastbaarheidsdocumentType('FML/IZP'), null);
  });
});

describe('parseDutchOrIsoDate', () => {
  it('parses Dutch long dates', () => {
    const d = parseDutchOrIsoDate('19 januari 2026');
    assert.ok(d);
    assert.equal(d!.getFullYear(), 2026);
    assert.equal(d!.getMonth(), 0);
    assert.equal(d!.getDate(), 19);
  });

  it('parses ISO dates', () => {
    const d = parseDutchOrIsoDate('2025-12-05');
    assert.ok(d);
    assert.equal(d!.getFullYear(), 2025);
  });

  it('does not treat upload timestamps as document dates', () => {
    assert.equal(parseDutchOrIsoDate('2026-07-16T10:22:00.000Z'), null);
  });
});

describe('resolveLeadingBelastbaarheidsdoc', () => {
  it('picks the newest document by document date across types', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [
        { type: 'fml', documentDate: '2025-01-10' },
        { type: 'izp', documentDate: '2025-12-05' },
        { type: 'lab', documentDate: '2024-06-01' },
      ],
    });
    assert.ok(result);
    assert.equal(result!.type, 'izp');
    assert.match(result!.datumVoluit, /december 2025/i);
  });

  it('falls back to model type when docs lack dates', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [{ type: 'fml' }, { type: 'izp' }],
      modelType: 'izp',
      modelDatumVoluit: '3 februari 2026',
    });
    assert.ok(result);
    assert.equal(result!.type, 'izp');
  });

  it('uses meta date when no typed docs', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [],
      metaDateIsoOrVoluit: '2025-12-12',
      modelType: 'fml',
    });
    assert.ok(result);
    assert.equal(result!.type, 'fml');
    assert.match(result!.datumVoluit, /december 2025/i);
  });

  it('returns null when nothing is available', () => {
    const result = resolveLeadingBelastbaarheidsdoc({ docs: [] });
    assert.equal(result, null);
  });

  it('Hippman-shaped: meta kind+date wins over fml_izp upload timestamp', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [
        {
          type: 'fml_izp',
          uploaded_at: '2026-07-16T14:00:00.000Z',
        },
      ],
      metaDateIsoOrVoluit: '2026-06-09',
      metaKind: 'fml',
    });
    assert.ok(result);
    assert.equal(result!.type, 'fml');
    assert.match(result!.datumVoluit, /9 juni 2026/i);
    assert.equal(result!.isoDate, '2026-06-09');
  });

  it('never ranks by uploaded_at alone', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [
        { type: 'fml', uploaded_at: '2026-07-16T14:00:00.000Z' },
        { type: 'izp', uploaded_at: '2026-08-01T14:00:00.000Z' },
      ],
      modelType: 'fml',
      modelDatumVoluit: '9 juni 2026',
    });
    assert.ok(result);
    // No documentDate → falls through; meta/model date used with model or first typed match
    assert.equal(result!.type, 'fml');
    assert.match(result!.datumVoluit, /juni 2026/i);
  });

  it('accepts uppercase meta kind from Gegevens UI', () => {
    const result = resolveLeadingBelastbaarheidsdoc({
      docs: [],
      metaDateIsoOrVoluit: '2026-06-09',
      metaKind: 'FML',
    });
    assert.ok(result);
    assert.equal(result!.type, 'fml');
  });
});
