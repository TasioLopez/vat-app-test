/**
 * Visible only when NEXT_PUBLIC_APP_ENV=staging.
 * Keeps client review sessions from being confused with production.
 */
export function StagingEnvironmentBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') {
    return null;
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] w-full bg-amber-500 px-3 py-1.5 text-center text-sm font-medium text-amber-950"
    >
      Test environment — changes here do not affect production
    </div>
  );
}
