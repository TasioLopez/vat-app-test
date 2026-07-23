'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SELECT_CLASS } from '@/lib/select-class';
import {
  fetchOrgDirectory,
  formatOrgUserDisplayName,
  type OrgDirectoryUser,
} from '@/lib/users/org-directory';

const NONE_VALUE = '__none__';
const ME_VALUE = '__me__';

type OrgUserSelectProps = {
  supabase: SupabaseClient;
  value: string | null | undefined;
  onChange: (userId: string | null, user: OrgDirectoryUser | null) => void;
  /** When set, shows a “Ik (…)" shortcut that selects this user id. */
  currentUserId?: string | null;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Preloaded directory; if omitted, fetches on mount. */
  users?: OrgDirectoryUser[];
};

export function OrgUserSelect({
  supabase,
  value,
  onChange,
  currentUserId,
  allowNone = false,
  noneLabel = '— Geen —',
  placeholder = 'Selecteer gebruiker',
  className,
  disabled,
  users: usersProp,
}: OrgUserSelectProps) {
  const [users, setUsers] = useState<OrgDirectoryUser[]>(usersProp ?? []);
  const [loading, setLoading] = useState(!usersProp);

  useEffect(() => {
    if (usersProp) {
      setUsers(usersProp);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchOrgDirectory(supabase).then((list) => {
      if (!cancelled) {
        setUsers(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, usersProp]);

  const selectValue = value || (allowNone ? NONE_VALUE : undefined);

  return (
    <Select
      value={selectValue}
      disabled={disabled || loading}
      onValueChange={(v) => {
        if (v === NONE_VALUE) {
          onChange(null, null);
          return;
        }
        if (v === ME_VALUE && currentUserId) {
          const me = users.find((u) => u.id === currentUserId) ?? null;
          onChange(currentUserId, me);
          return;
        }
        const user = users.find((u) => u.id === v) ?? null;
        onChange(v, user);
      }}
    >
      <SelectTrigger className={cn(SELECT_CLASS, className)}>
        <SelectValue placeholder={loading ? 'Laden…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
        {currentUserId ? (
          <SelectItem value={ME_VALUE}>
            Ik
            {(() => {
              const me = users.find((u) => u.id === currentUserId);
              return me ? ` (${formatOrgUserDisplayName(me)})` : '';
            })()}
          </SelectItem>
        ) : null}
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {formatOrgUserDisplayName(u)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
