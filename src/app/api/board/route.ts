import { NextResponse } from "next/server";
import { getBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ rows: await getBoard(), at: new Date().toISOString() });
}
