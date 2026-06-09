import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import {
  buildZoekprofielContextFromMeta,
  generateZoekprofiel,
  isBelastbaarheidsDoc,
} from "@/lib/tp/zoekprofiel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("first_name, last_name")
      .eq("id", employeeId)
      .single();

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("fml_izp_lab_date")
      .eq("employee_id", employeeId)
      .single();

    const { data: docs } = await supabase
      .from("documents")
      .select("type, url, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });

    const allDocs = docs || [];
    const belastbaarheidsDocs = allDocs.filter((d) => isBelastbaarheidsDoc(d.type));
    if (belastbaarheidsDocs.length === 0) {
      return NextResponse.json(
        { error: "Geen FML/IZP document gevonden", details: {} },
        { status: 200 }
      );
    }

    const ctx = {
      ...buildZoekprofielContextFromMeta(meta?.fml_izp_lab_date),
      employee: employee ?? {},
    };

    let zoekprofiel: string;

    try {
      const result = await generateZoekprofiel(openai, supabase, ctx, allDocs);
      zoekprofiel = result.zoekprofiel;
      if (!zoekprofiel.trim()) {
        return NextResponse.json(
          { error: "Geen zoekprofielinformatie gevonden in documenten", details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("❌ Zoekprofiel generation failed:", error);
      if (error instanceof Error && error.message.includes('could not be uploaded')) {
        return NextResponse.json(
          { error: "Kon documenten niet uploaden", details: {} },
          { status: 500 }
        );
      }
      zoekprofiel = `[Zoekprofiel voor ${employee?.first_name || "werknemer"} ${employee?.last_name || ""} - AI generatie mislukt, handmatig invullen vereist]`;
    }

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, zoekprofiel } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { zoekprofiel },
      autofilled_fields: ["zoekprofiel"],
    });
  } catch (err: any) {
    console.error("❌ zoekprofiel route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
