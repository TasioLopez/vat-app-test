/**
 * Shared service-role admin client.
 * Lazy — safe to import at module scope during `next build`.
 */
export {
  serviceRoleSupabase as supabaseAdmin,
  getServiceRoleSupabase,
} from '@/lib/supabase/service-role';
