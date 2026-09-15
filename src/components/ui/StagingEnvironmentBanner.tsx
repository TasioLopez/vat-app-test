'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'vat-staging-banner-dismissed';

/**
 * Visible only when NEXT_PUBLIC_APP_ENV=staging.
 * Keeps client review sessions from being confused with production.
 */
export function StagingEnvironmentBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, []);

  if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') {
    return null;
  }

  if (!ready || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] flex w-full items-center justify-center bg-amber-500 px-10 py-1.5 text-center text-sm font-medium text-amber-950"
    >
      <span>Test environment — changes here do not affect production</span>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-amber-950/80 hover:bg-amber-600/40 hover:text-amber-950"
        aria-label="Sluit testomgeving-banner"
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, '1');
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
