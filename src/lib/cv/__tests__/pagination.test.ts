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
import { getDefaultLayout, layoutStructureFingerprint, migrateLegacyLayout } from '../layout-presets';
import type { CvLayoutSection, CvModel, CvSectionType, CvSectionLayout } from '@/types/cv';
import { emptyCvModel, newCvId } from '@/types/cv';

function legacyNode(
  type: CvSectionType,
  layout: CvSectionLayout,
  children?: CvLayoutSection[]
): CvLayoutSection {
  return {
    id: `${type}-${layout}`,
    type,
    layout,
    visible: true,
    ...(children ? { children } : {}),
  };
}

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

  it('puts an atom that misses the short first page onto the next full page', () => {
    const pages = packColumn([{ id: 'a', height: 200 }], 300, 24, { firstPageInnerHeight: 120 });
    assert.deepEqual(pages, [[], ['a']]);
  });

  it('still fills the short first page when the atom fits', () => {
    const pages = packColumn(
      [
        { id: 'a', height: 80 },
        { id: 'b', height: 200 },
      ],
      300,
      24,
      { firstPageInnerHeight: 120 }
    );
    assert.deepEqual(pages, [['a'], ['b']]);
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

  it('groups an editorial header lockup and leaves lists in the flow', () => {
    const sections: CvLayoutSection[] = [
      legacyNode('personal_header', 'full'),
      legacyNode('contact', 'full'),
      legacyNode('photo', 'full'),
      legacyNode('profile', 'full'),
      legacyNode('skills', 'full'),
    ];
    const atoms = buildColumnAtoms(sections, emptyCvModel(), { chrome: 'editorial' });
    assert.equal(atoms[0]?.kind, 'header_lockup');
    assert.equal(atoms[1]?.kind, 'section');
    assert.equal(atoms.some((a) => a.kind === 'footer_strip'), false);
  });

  it('keeps the timeline footer strip as one atom', () => {
    const sections: CvLayoutSection[] = [
      legacyNode('personal_header', 'full'),
      legacyNode('contact', 'full'),
      legacyNode('profile', 'full'),
      legacyNode('skills', 'full'),
      legacyNode('languages', 'full'),
      legacyNode('extra', 'full'),
    ];
    const atoms = buildColumnAtoms(sections, emptyCvModel(), { chrome: 'timeline' });
    const footer = atoms.find((a) => a.kind === 'footer_strip');
    assert.ok(footer && footer.kind === 'footer_strip');
    assert.equal(footer.sectionIds.length, 3);
    assert.equal(
      atoms.filter((a) => a.kind === 'section').length,
      1
    );
  });
});

describe('template presets', () => {
  it('keeps modern as a sidebar layout with the photo first', () => {
    const layout = getDefaultLayout('modern_professional');
    assert.equal(layout[0]?.layout, 'two_column');
    const sidebar = layout[0]?.children?.find((c) => c.layout === 'sidebar');
    const main = layout[0]?.children?.find((c) => c.layout === 'main');
    assert.equal(sidebar?.children?.[0]?.type, 'photo');
    assert.equal(main?.children?.[0]?.type, 'personal_header');
  });

  it('keeps tweeluik as an even split with the story on the sidebar', () => {
    const layout = getDefaultLayout('balanced_split');
    const sidebar = layout[0]?.children?.find((c) => c.layout === 'sidebar');
    assert.equal(sidebar?.children?.[0]?.type, 'personal_header');
    assert.equal(layout[0]?.children?.find((c) => c.layout === 'main')?.children?.[0]?.type, 'photo');
  });

  it('migrates the old formeel stack and leaves a custom layout alone', () => {
    const oldStack: CvLayoutSection[] = [
      legacyNode('personal_header', 'full'),
      legacyNode('contact', 'full'),
      legacyNode('photo', 'full'),
      legacyNode('profile', 'full'),
      legacyNode('experience', 'full'),
      legacyNode('education', 'full'),
      legacyNode('skills', 'grid_3', [
        legacyNode('skills', 'half'),
        legacyNode('languages', 'half'),
        legacyNode('interests', 'half'),
      ]),
      legacyNode('digital_skills', 'full'),
      legacyNode('extra', 'full'),
    ];
    const migrated = migrateLegacyLayout('corporate_minimal', oldStack);
    assert.equal(
      layoutStructureFingerprint(migrated),
      layoutStructureFingerprint(getDefaultLayout('corporate_minimal'))
    );
    assert.equal(migrated.some((s) => s.layout === 'grid_3'), false);

    const custom = [...oldStack, legacyNode('profile', 'full')];
    assert.equal(
      layoutStructureFingerprint(migrateLegacyLayout('corporate_minimal', custom)),
      layoutStructureFingerprint(custom)
    );
  });

  it('migrates the old creatief preamble into a band plus two columns', () => {
    const oldCreative: CvLayoutSection[] = [
      legacyNode('personal_header', 'full'),
      legacyNode('photo', 'full'),
      legacyNode('profile', 'two_column', [
        legacyNode('contact', 'sidebar', [
          legacyNode('profile', 'full'),
          legacyNode('experience', 'full'),
          legacyNode('education', 'full'),
        ]),
        legacyNode('profile', 'main', [
          legacyNode('contact', 'full'),
          legacyNode('skills', 'full'),
          legacyNode('languages', 'full'),
          legacyNode('interests', 'full'),
          legacyNode('digital_skills', 'full'),
          legacyNode('extra', 'full'),
        ]),
      ]),
    ];
    const migrated = migrateLegacyLayout('creative_bold', oldCreative);
    assert.equal(migrated[0]?.type, 'personal_header');
    assert.equal(migrated[1]?.type, 'contact');
    assert.equal(migrated[2]?.type, 'photo');
    assert.equal(migrated[3]?.layout, 'two_column');
    assert.equal(
      layoutStructureFingerprint(migrateLegacyLayout('modern_professional', oldCreative)),
      layoutStructureFingerprint(oldCreative)
    );
  });
});
