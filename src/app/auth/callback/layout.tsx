import type { ReactNode } from 'react';

/** Segment config must live in a Server Component — client pages ignore `dynamic`. */
export const dynamic = 'force-dynamic';

export default function AuthCallbackLayout({ children }: { children: ReactNode }) {
  return children;
}
