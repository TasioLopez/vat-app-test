import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sidebarPositionFromColumnOrder } from '../layout-editor-utils';

describe('sidebarPositionFromColumnOrder', () => {
  const sidebarId = 'sidebar-1';
  const mainId = 'main-1';

  it('returns left when sidebar is before main', () => {
    assert.equal(
      sidebarPositionFromColumnOrder([sidebarId, mainId], sidebarId, mainId),
      'left'
    );
  });

  it('returns right when main is before sidebar', () => {
    assert.equal(
      sidebarPositionFromColumnOrder([mainId, sidebarId], sidebarId, mainId),
      'right'
    );
  });

  it('defaults to left when ids are missing', () => {
    assert.equal(sidebarPositionFromColumnOrder([sidebarId], sidebarId, mainId), 'left');
  });
});
