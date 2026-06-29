export const CV_PHOTO_SIZE_MIN_PX = 48;
export const CV_PHOTO_SIZE_MAX_PX = 160;
export const CV_PHOTO_SIZE_DEFAULT_SIDEBAR_PX = 96;
export const CV_PHOTO_SIZE_DEFAULT_MAIN_PX = 80;

export function getDefaultCvPhotoSizePx(isSidebar: boolean): number {
  return isSidebar ? CV_PHOTO_SIZE_DEFAULT_SIDEBAR_PX : CV_PHOTO_SIZE_DEFAULT_MAIN_PX;
}

export function clampCvPhotoSizePx(sizePx: number): number {
  return Math.round(
    Math.min(CV_PHOTO_SIZE_MAX_PX, Math.max(CV_PHOTO_SIZE_MIN_PX, sizePx))
  );
}

export function normalizePhotoSizePx(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const clamped = clampCvPhotoSizePx(n);
  if (clamped < CV_PHOTO_SIZE_MIN_PX || clamped > CV_PHOTO_SIZE_MAX_PX) return undefined;
  return clamped;
}

export function getCvPhotoSizePx(stored: number | undefined, isSidebar: boolean): number {
  if (stored !== undefined && Number.isFinite(stored)) {
    return clampCvPhotoSizePx(stored);
  }
  return getDefaultCvPhotoSizePx(isSidebar);
}
