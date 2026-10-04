import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePackedPages,
  normalizeSingleColumnPages,
  packColumn,
  splitTextNearMiddle,
  twoColumnPageCount,
} from '../pagination';
import { buildColumnAtoms } from '../atoms';
import type { CvLayoutSection, CvModel } from '@/types/cv';
import { emptyCvModel, newCvId } from '@/types/cv';

describe('packColumn', () => {
  it('packs atoms that fit on one page', () => {
    const pages = packColumn(
      [
        { id: 'a', height: 100 },
        { id: 'b', height: 100 },
      ],
      300,
      24
    );
    assert.deepEqual(pages, [['a', 'b']]);
  });

  it('moves overflow atom to next page', () => {
    const pages = packColumn(
      [
        { id: 'a', height: 200 },
        { id: 'b', height: 200 },
      ],
      300,
      24
    );
    assert.deepEqual(pages, [['a'], ['b']]);
  });

  it('never drops atoms and gives oversized atoms their own page', () => {
    const pages = packColumn(
      [
        { id: 'a', height: 100 },
        { id: 'big', height: 500 },
        { id: 'c', height: 80 },
      ],
      300,
      24
    );
    assert.deepEqual(pages, [['a'], ['big'], ['c']]);
  });

  it('skips zero-height atoms so they cannot create pages', () => {
    const pages = packColumn(
      [
        { id: 'a', height: 100 },
        { id: 'empty', height: 0 },
      ],
      300,
      24
    );
    assert.deepEqual(pages, [['a']]);
  });
});

describe('normalizePackedPages', () => {
  it('uses max of sidebar/main page counts', () => {
    assert.equal(twoColumnPageCount([['a'], ['b']], [['c']]), 2);
  });

  it('strips empty trailing pages', () => {
    const result = normalizePackedPages([['a'], []], [['b'], []]);
    assert.equal(result.pageCount, 1);
    assert.deepEqual(result.sidebarPages, [['a']]);
    assert.deepEqual(result.mainPages, [['b']]);
  });

  it('keeps a page when only one column has content', () => {
    const result = normalizePackedPages([['a'], ['b']], [['c'], []]);
    assert.equal(result.pageCount, 2);
    assert.deepEqual(result.mainPages[1], []);
  });
});

describe('normalizeSingleColumnPages', () => {
  it('drops empty leading and trailing pages', () => {
    assert.deepEqual(normalizeSingleColumnPages([[], ['a'], []]), [['a']]);
  });
});

describe('splitTextNearMiddle', () => {
  it('splits long text', () => {
    const text =
      'Eerste zin over werkervaring. Tweede zin met meer detail. Derde zin sluit af met context.';
    const parts = splitTextNearMiddle(text);
    assert.ok(parts);
    assert.ok(parts![0].length > 10);
    assert.ok(parts![1].length > 10);
  });

  it('returns null for short text', () => {
    assert.equal(splitTextNearMiddle('kort'), null);
  });
});

describe('buildColumnAtoms', () => {
  it('splits experience into header + items', () => {
    const expId = newCvId();
    const itemId = newCvId();
    const sections: CvLayoutSection[] = [
      {
        id: expId,
        type: 'experience',
        layout: 'full',
        visible: true,
      },
    ];
    const model: CvModel = {
      ...emptyCvModel(),
      experience: [{ id: itemId, role: 'Dev', description: 'Worked' }],
    };
    const atoms = buildColumnAtoms(sections, model);
    assert.equal(atoms[0]?.kind, 'section_header');
    assert.equal(atoms[1]?.kind, 'experience_item');
    if (atoms[1]?.kind === 'experience_item') {
      assert.equal(atoms[1].itemId, itemId);
    }
  });
});
