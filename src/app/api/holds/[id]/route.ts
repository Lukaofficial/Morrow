import { NextRequest, NextResponse } from "next/server";
import { throttle } from "@/lib/api";
import { releaseHold } from "@/lib/holds";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = throttle(request, "holds", 30);
  if (limited) return limited;
  const { id } = await params;
  await releaseHold(id);
  return new NextResponse(null, { status: 204 });
}
