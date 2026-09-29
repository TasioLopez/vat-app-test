import { NextRequest, NextResponse } from "next/server";
import { serviceRoleSupabase } from "@/lib/supabase/service-role";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";
import {
  toRpcAssignments,
  validateDeleteUserAssignments,
  type DeleteUserAssignment,
} from "@/lib/users/delete-user-assignments";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserWithRole();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const userId = String(body?.userId ?? "").trim();
    const rawAssignments = Array.isArray(body?.assignments) ? body.assignments : null;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Je kunt je eigen account niet verwijderen." },
        { status: 400 }
      );
    }

    if (rawAssignments === null) {
      return NextResponse.json({ error: "assignments must be an array." }, { status: 400 });
    }

    const assignments: DeleteUserAssignment[] = rawAssignments.map(
      (a: { employeeId?: string; ownerId?: string }) => ({
        employeeId: String(a?.employeeId ?? "").trim(),
        ownerId: String(a?.ownerId ?? "").trim(),
      })
    );

    const { data: target, error: targetErr } = await serviceRoleSupabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetErr) {
      return NextResponse.json({ error: targetErr.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: "Gebruiker niet gevonden." }, { status: 404 });
    }

    const { data: ownedRows, error: ownedErr } = await serviceRoleSupabase
      .from("employees")
      .select("id")
      .eq("owner_id", userId);

    if (ownedErr) {
      return NextResponse.json({ error: ownedErr.message }, { status: 500 });
    }

    const ownedEmployeeIds = (ownedRows ?? []).map((r) => r.id as string);
    const validation = validateDeleteUserAssignments({
      fromUserId: userId,
      ownedEmployeeIds,
      assignments,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const userClient = await getSupabaseServerClient();
    const { error: rpcError } = await userClient.rpc("bulk_reassign_employee_owners", {
      p_from_user_id: userId,
      p_assignments: toRpcAssignments(validation.assignments),
    });

    if (rpcError) {
      console.error("bulk_reassign_employee_owners failed:", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Dossiers hertoewijzen mislukt." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await serviceRoleSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("auth.admin.deleteUser failed:", deleteError);
      return NextResponse.json(
        {
          error:
            "Dossiers zijn hertoegewezen, maar de gebruiker kon niet worden verwijderd. " +
            (deleteError.message || "Probeer het opnieuw."),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Gebruiker verwijderd." });
  } catch (err: unknown) {
    console.error("delete-user error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
