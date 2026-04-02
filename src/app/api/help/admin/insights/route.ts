import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export async function GET() {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await getSupabaseServerClient();

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id, status, category_id, created_at, resolved_at, first_admin_touch_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = tickets || [];
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const weekKey = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const w = Math.ceil(
      ((d.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + new Date(y, 0, 1).getDay() + 1) / 7
    );
    return `${y}-W${w}`;
  };
  const byWeek: Record<string, number> = {};

  for (const t of list) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byCategory[t.category_id] = (byCategory[t.category_id] || 0) + 1;
    const wk = weekKey(t.created_at);
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  }

  const { data: cats } = await supabase
    .from("support_ticket_categories")
    .select("id, slug, label_nl");

  const catLabels = new Map((cats || []).map((c) => [c.id, c.label_nl]));

  const categoryBreakdown = Object.entries(byCategory).map(([cid, count]) => ({
    categoryId: cid,
    label: catLabels.get(cid) || cid,
    count,
  }));

  const businessDaysBetween = (start: Date, end: Date) => {
    let days = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    while (cur < e) {
      cur.setDate(cur.getDate() + 1);
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days += 1;
    }
    return days;
  };

  let slaMet = 0;
  let slaTotal = 0;
  for (const t of list) {
    if (!t.resolved_at) continue;
    slaTotal += 1;
    const created = new Date(t.created_at);
    const resolved = new Date(t.resolved_at);
    if (businessDaysBetween(created, resolved) <= 3) slaMet += 1;
  }

  return NextResponse.json({
    totalTickets: list.length,
    byStatus,
    byWeek,
    categoryBreakdown,
    slaResolvedWithin3BusinessDays:
      slaTotal === 0 ? null : { met: slaMet, total: slaTotal, rate: slaMet / slaTotal },
  });
}
