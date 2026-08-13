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
});
