"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Database } from "@/types/supabase";

type HelpNotificationsContextValue = {
  userTicketUnread: number;
  adminTicketUnread: number;
  userUnreadTicketIds: string[];
  adminUnreadTicketIds: string[];
  refresh: () => Promise<void>;
};

const HelpNotificationsContext = createContext<HelpNotificationsContextValue | null>(null);

function normalizeTicketIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export function HelpNotificationsProvider({
  role,
  children,
}: {
  role: string;
  children: ReactNode;
}) {
  const isAdmin = role === "admin";
  const [userTicketUnread, setUserTicketUnread] = useState(0);
  const [adminTicketUnread, setAdminTicketUnread] = useState(0);
  const [userUnreadTicketIds, setUserUnreadTicketIds] = useState<string[]>([]);
  const [adminUnreadTicketIds, setAdminUnreadTicketIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const userRes = await fetch("/api/help/notifications");
      if (userRes.ok) {
        const j = await userRes.json();
        const ids = normalizeTicketIds(j.ticketIds);
        setUserUnreadTicketIds(ids);
        setUserTicketUnread(typeof j.count === "number" ? j.count : ids.length);
      }
      if (isAdmin) {
        const adminRes = await fetch("/api/help/admin/notifications");
        if (adminRes.ok) {
          const j = await adminRes.json();
          const ids = normalizeTicketIds(j.ticketIds);
          setAdminUnreadTicketIds(ids);
          setAdminTicketUnread(typeof j.count === "number" ? j.count : ids.length);
        }
      } else {
        setAdminUnreadTicketIds([]);
        setAdminTicketUnread(0);
      }
    } catch {
      /* network errors ignored */
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void refresh();
      }, 500);
    };

    const channel = supabase
      .channel("help-ticket-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages" },
        debouncedRefresh
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        debouncedRefresh
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const value: HelpNotificationsContextValue = {
    userTicketUnread,
    adminTicketUnread,
    userUnreadTicketIds,
    adminUnreadTicketIds,
    refresh,
  };

  return (
    <HelpNotificationsContext.Provider value={value}>{children}</HelpNotificationsContext.Provider>
  );
}

export function useHelpNotifications(): HelpNotificationsContextValue {
  const ctx = useContext(HelpNotificationsContext);
  if (!ctx) {
    throw new Error("useHelpNotifications must be used within HelpNotificationsProvider");
  }
  return ctx;
}
