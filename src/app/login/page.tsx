import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-slate-600">
          Laden…
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
