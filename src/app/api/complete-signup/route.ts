import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json(
    { error: "Deprecated endpoint. Use /api/signup/finalize." },
    { status: 410 }
  );
}
