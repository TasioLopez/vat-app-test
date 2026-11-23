import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import LoginPageClient from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p className="text-center text-sm text-gray-600">Laden…</p>
        </AuthShell>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
