import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import { validateCategoryReorder } from "@/lib/help/category-reorder";
import { reorderCategoriesSchema } from "@/lib/help/schemas";
import { supabaseAdmin } from "@/lib/supabase/serverAdmin";

export async function POST(req: NextRequest) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reorderCategoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: rows, error: loadErr } = await supabaseAdmin.from("kb_categories").select("id");

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }

  const existingIds = new Set((rows || []).map((r) => r.id as string));
  const v = validateCategoryReorder(parsed.data.items, existingIds);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const pItems = parsed.data.items.map((i) => ({
    id: i.id,
    parentId: i.parentId,
    sortOrder: i.sortOrder,
  }));

  // apply_kb_category_reorder added via migration; not yet in generated Database types
  const { error: rpcErr } = await (
    supabaseAdmin as unknown as {
      rpc: (n: string, a: { p_items: typeof pItems }) => ReturnType<typeof supabaseAdmin.rpc>;
    }
  ).rpc("apply_kb_category_reorder", { p_items: pItems });

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
