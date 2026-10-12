import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/shared";
import { db } from "@/db";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: { default: "관리자", template: "%s | Mosaic 관리자" }, robots: { index: false } };

/** 관리자 영역: 서버에서 권한 확인 (일반 사용자에게는 존재 자체를 숨기기 위해 404) */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (viewer.role !== "admin") notFound();
  const res = await db.execute<{ count: number }>(sql`select count(*)::int as count from reports where status = 'pending'`);

  return (
    <div className="min-h-dvh bg-neutral-50 md:flex">
      <AdminSidebar pendingReports={res.rows[0]?.count ?? 0} />
      <div className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
