import { prisma } from "@/lib/prisma";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/** Active category vocabulary (data-model.md defaults). */
export async function listCategories(): Promise<CategoryOption[]> {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
}
