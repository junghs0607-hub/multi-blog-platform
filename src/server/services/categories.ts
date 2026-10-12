import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import type { Category } from "@/types";

/** 카테고리는 변경이 드문 기준 데이터이므로 1분간 메모리 캐시합니다. */
const globalForCat = globalThis as unknown as { __mosaicCategories?: { at: number; data: Category[] } };

export async function listCategories(): Promise<Category[]> {
  const cached = globalForCat.__mosaicCategories;
  if (cached && Date.now() - cached.at < 60_000) return cached.data;
  const data = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, description: categories.description })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  globalForCat.__mosaicCategories = { at: Date.now(), data };
  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return (await listCategories()).find((c) => c.slug === slug) ?? null;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return (await listCategories()).find((c) => c.id === id) ?? null;
}
