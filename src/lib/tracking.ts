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

  const now = new Date().toISOString();
  const updateData: {
    user_id: string;
    entity_type: 'employee' | 'client';
    entity_id: string;
    last_accessed_at: string;
    last_modified_at?: string;
  } = {
    user_id: user.id,
    entity_type: entityType,
    entity_id: entityId,
    last_accessed_at: now,
  };

  if (isModification) {
    updateData.last_modified_at = now;
  }

  await supabase
    .from('user_entity_activity')
    .upsert(updateData, {
      onConflict: 'user_id,entity_type,entity_id',
    });
}
