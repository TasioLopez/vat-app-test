/**
 * TP 2026 print geometry shared by cover (`Cover2026A4`) and body pages (`A4LogoHeader`).
 * Matches `01_Trajectplan_voorkant` / Google Docs header inset.
 */
export const TP2026_LOGO = {
  leftPx: 76,
  topPx: 54,
  widthPx: 165,
  heightPx: 55,
} as const;

/** ~1in @ 96dpi — narrows tables vs old `px-12` body pages. */
export const TP2026_BODY_MARGIN_X_PX = 96;

/**
 * In-flow spacer so first section starts below the logo asset + gap
 * (logo is `position: absolute` and does not reserve space; tagline is in the PNG).
 */
export const TP2026_BODY_FLOW_START_SPACER_PX =
  TP2026_LOGO.topPx + TP2026_LOGO.heightPx + 12 + 40;
