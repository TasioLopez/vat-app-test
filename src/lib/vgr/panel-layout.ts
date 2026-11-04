/** Vertical gap between body atoms that are not in the same shaded panel. */
export const VGR_ATOM_GAP_PX = 6;
/** Horizontal inset of text inside a shaded panel. Measurement uses the narrower width. */
export const VGR_PANEL_PAD_X_PX = 14;
/** Top and bottom padding of a shaded panel, including a fragment continued on the next page. */
export const VGR_PANEL_PAD_Y_PX = 10;
/** Space between blocks inside one panel (label, lead, quote). */
export const VGR_PANEL_INNER_GAP_PX = 14;
/** Top or bottom stroke of a bordered table frame. Rows inside the frame have no extra gap. */
export const VGR_FRAME_BORDER_PX = 1;

export type VgrPanelAtom = { id: string; panel?: string; frame?: string };

/** Height of a page slice, including panel padding that the atom content measurement omits. */
export function vgrPackedHeight(
  atoms: readonly VgrPanelAtom[],
  heights: readonly number[],
  indices: readonly number[],
): number {
  let total = 0;
  for (let n = 0; n < indices.length; n++) {
    const i = indices[n];
    const atom = atoms[i];
    const prev = n > 0 ? atoms[indices[n - 1]] : undefined;
    const next = n + 1 < indices.length ? atoms[indices[n + 1]] : undefined;
    const sameFrame = Boolean(atom?.frame && atom.frame === prev?.frame);
    if (!prev) {
      if (atom?.panel) total += VGR_PANEL_PAD_Y_PX;
      else if (atom?.frame) total += VGR_FRAME_BORDER_PX;
    } else if (atom?.panel && atom.panel === prev?.panel) {
      total += VGR_PANEL_INNER_GAP_PX;
    } else if (sameFrame) {
      // Table rows sit flush inside the outline.
    } else {
      total += VGR_ATOM_GAP_PX;
      if (atom?.panel) total += VGR_PANEL_PAD_Y_PX;
      else if (atom?.frame) total += VGR_FRAME_BORDER_PX;
    }
    total += heights[i] ?? 0;
    const continuesPanel = Boolean(atom?.panel && next && next.panel === atom.panel);
    const continuesFrame = Boolean(atom?.frame && next && next.frame === atom.frame);
    if (atom?.panel && !continuesPanel) total += VGR_PANEL_PAD_Y_PX;
    else if (atom?.frame && !continuesFrame) total += VGR_FRAME_BORDER_PX;
  }
  return total;
}

/** Consecutive atoms that share a panel or frame id become one box on this page. */
export function groupVgrPageAtoms(
  atoms: readonly VgrPanelAtom[],
  indices: readonly number[],
): { key: string; panel?: string; frame?: string; indices: number[] }[] {
  const groups: { key: string; panel?: string; frame?: string; indices: number[] }[] = [];
  for (const i of indices) {
    const atom = atoms[i];
    const panel = atom?.panel;
    const frame = atom?.frame;
    const last = groups[groups.length - 1];
    if ((panel && last?.panel === panel) || (frame && last?.frame === frame)) {
      last!.indices.push(i);
    } else {
      groups.push({
        key: panel
          ? `${panel}@${atom?.id ?? i}`
          : frame
            ? `${frame}@${atom?.id ?? i}`
            : (atom?.id ?? String(i)),
        panel,
        frame,
        indices: [i],
      });
    }
  }
  return groups;
}
