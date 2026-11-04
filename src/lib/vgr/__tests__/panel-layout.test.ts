import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupVgrPageAtoms,
  vgrPackedHeight,
  VGR_ATOM_GAP_PX,
  VGR_PANEL_INNER_GAP_PX,
  VGR_PANEL_PAD_Y_PX,
} from '@/lib/vgr/panel-layout';

const atoms = [
  { id: 'title', panel: undefined },
  { id: 'a', panel: 'bp' },
  { id: 'b', panel: 'bp' },
  { id: 'c', panel: 'bp' },
  { id: 'next', panel: undefined },
];

describe('vgr panel layout', () => {
  it('adds padding around a panel and a larger gap between its blocks', () => {
    const height = vgrPackedHeight(atoms, [20, 100, 80, 40, 30], [0, 1, 2]);
    assert.equal(
      height,
      20 +
        VGR_ATOM_GAP_PX +
        VGR_PANEL_PAD_Y_PX +
        100 +
        VGR_PANEL_INNER_GAP_PX +
        80 +
        VGR_PANEL_PAD_Y_PX,
    );
  });

  it('keeps top and bottom padding on a panel fragment that continues on the next page', () => {
    const continued = vgrPackedHeight(atoms, [20, 100, 80, 40, 30], [3]);
    assert.equal(continued, VGR_PANEL_PAD_Y_PX + 40 + VGR_PANEL_PAD_Y_PX);
  });

  it('wraps a continued fragment in the same panel on the next page', () => {
    const first = groupVgrPageAtoms(atoms, [0, 1, 2]);
    const second = groupVgrPageAtoms(atoms, [3, 4]);
    assert.deepEqual(
      first.map((g) => ({ panel: g.panel, indices: g.indices })),
      [
        { panel: undefined, indices: [0] },
        { panel: 'bp', indices: [1, 2] },
      ],
    );
    assert.deepEqual(
      second.map((g) => ({ panel: g.panel, indices: g.indices })),
      [
        { panel: 'bp', indices: [3] },
        { panel: undefined, indices: [4] },
      ],
    );
  });
});
