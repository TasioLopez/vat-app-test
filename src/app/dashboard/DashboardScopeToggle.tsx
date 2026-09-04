'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardScope } from '@/lib/dashboard/stats';

type Props = {
  scope: DashboardScope;
};

export default function DashboardScopeToggle({ scope }: Props) {
  const router = useRouter();

  const setScope = (next: DashboardScope) => {
    if (next === scope) return;
    router.push(`/dashboard?scope=${next}`);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white p-1 shadow-sm">
      <Button
        type="button"
        size="sm"
        variant={scope === 'mine' ? 'default' : 'ghost'}
        className={cn(scope !== 'mine' && 'text-gray-600')}
        onClick={() => setScope('mine')}
      >
        Mijn overzicht
      </Button>
      <Button
        type="button"
        size="sm"
        variant={scope === 'all' ? 'default' : 'ghost'}
        className={cn(scope !== 'all' && 'text-gray-600')}
        onClick={() => setScope('all')}
      >
        Alles
      </Button>
    </div>
  );
}
