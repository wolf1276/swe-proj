import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRoute, requireStudent } from "@/lib/http";

/** GET /api/categories - active vocabulary (verified active student). */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    await requireStudent(request);
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json({ items: categories });
  });
}
