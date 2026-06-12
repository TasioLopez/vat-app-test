import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultLayout } from '../layout-presets';
import {
  addLayoutSection,
  canAddSection,
  findSectionByType,
  resolveAddParentId,
} from '../layout-utils';

describe('resolveAddParentId', () => {
  it('routes sidebar layout to sidebar column', () => {
    const layout = getDefaultLayout('modern_professional');
    const sidebarId = resolveAddParentId(layout, 'sidebar');
    const mainId = resolveAddParentId(layout, 'full');
    assert.ok(sidebarId);
    assert.ok(mainId);
    assert.notEqual(sidebarId, mainId);
  });

  it('returns null for single-column templates', () => {
    const layout = getDefaultLayout('corporate_minimal');
    assert.equal(resolveAddParentId(layout, 'full'), null);
  });
});

describe('addLayoutSection singleton guard', () => {
  it('blocks duplicate visible singleton', () => {
    const layout = getDefaultLayout('modern_professional');
    assert.equal(canAddSection(layout, 'profile'), false);
    const result = addLayoutSection(layout, resolveAddParentId(layout, 'full'), 'profile', 'full');
    assert.equal(result.ok, false);
  });

  it('re-shows hidden singleton instead of duplicating', () => {
    let layout = getDefaultLayout('modern_professional');
    const existing = findSectionByType(layout, 'profile');
    assert.ok(existing);
    layout = layout.map((n) =>
      n.layout === 'two_column' && n.children
        ? {
            ...n,
            children: n.children.map((c) =>
              c.layout === 'main' && c.children
                ? {
                    ...c,
                    children: c.children.map((ch) =>
                      ch.id === existing!.id ? { ...ch, visible: false } : ch
                    ),
                  }
                : c
            ),
          }
        : n
    );
    assert.equal(canAddSection(layout, 'profile'), true);
    const parentId = resolveAddParentId(layout, 'full');
    const result = addLayoutSection(layout, parentId, 'profile', 'full');
    assert.equal(result.ok, true);
    const after = findSectionByType(result.layout, 'profile');
    assert.equal(after?.visible, true);
    const allProfiles = (function count(layoutNodes: typeof layout): number {
      let n = 0;
      for (const s of layoutNodes) {
        if (s.type === 'profile' && s.layout !== 'two_column' && s.layout !== 'sidebar' && s.layout !== 'main') {
          n += 1;
        }
        if (s.children) n += count(s.children);
      }
      return n;
    })(result.layout);
    assert.equal(allProfiles, 1);
  });
});
