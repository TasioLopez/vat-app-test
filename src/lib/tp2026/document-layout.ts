/**
 * TP 2026 print geometry shared by cover (`Cover2026A4`) and body pages (`A4LogoHeader`).
 * Matches `01_Trajectplan_voorkant` / Google Docs header inset.
 */

/** ~1in @ 96dpi — narrows tables vs old `px-12` body pages. */
export const TP2026_BODY_MARGIN_X_PX = 96;

/**
 * Header logo: left edge aligned with body content (`px-24` = {@link TP2026_BODY_MARGIN_X_PX}).
 * Size matches the ValentineZ wordmark + Z mark aspect (~4.6:1 after trim).
 */
export const TP2026_LOGO = {
  leftPx: TP2026_BODY_MARGIN_X_PX,
  topPx: 54,
  widthPx: 165,
  heightPx: 36,
} as const;

/**
 * In-flow spacer so first section starts below the logo asset + gap
 * (logo is `position: absolute` and does not reserve space; tagline is in the PNG).
 * Gap below logo: 12 + 20px (~1.5 lines).
 */
export const TP2026_BODY_FLOW_START_SPACER_PX =
  TP2026_LOGO.topPx + TP2026_LOGO.heightPx + 12 + 20;

/** ValentineZ logo used as list bullet in TP 2026 body (was 14px). */
export const TP2026_LOGO_BULLET_PX = 11;
