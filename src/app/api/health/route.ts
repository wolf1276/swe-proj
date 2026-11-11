import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/health - liveness/readiness probe (no auth data exposed). */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
