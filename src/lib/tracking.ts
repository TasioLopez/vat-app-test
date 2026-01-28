'use client';

import { createBrowserClient } from '@/lib/supabase/client';

export async function trackAccess(
  entityType: 'employee' | 'client',
  entityId: string,
  isModification: boolean = false
) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const tableName = entityType === 'employee' ? 'employee_users' : 'user_clients';
  const entityIdColumn = entityType === 'employee' ? 'employee_id' : 'client_id';

  const updateData: any = {
    user_id: user.id,
    [entityIdColumn]: entityId,
    last_accessed_at: new Date().toISOString(),
  };

  if (isModification) {
    updateData.last_modified_at = new Date().toISOString();
    // Also update last_accessed_at on modification
    updateData.last_accessed_at = new Date().toISOString();
  }

  // Use upsert - if the relationship doesn't exist, create it; if it does, update timestamps
  await supabase
    .from(tableName)
    .upsert(updateData, {
      onConflict: `user_id,${entityIdColumn}`,
    });
}

