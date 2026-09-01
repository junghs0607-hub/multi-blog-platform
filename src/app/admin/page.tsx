import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users, blogs, articles, comments } from "@/db/schema";
import { sql } from "drizzle-orm";
import { AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/");
  }

  let counts = { users: 0, blogs: 0, articles: 0, comments: 0 };
  try {
    const [uc] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [bc] = await db.select({ count: sql<number>`count(*)::int` }).from(blogs);
    const [ac] = await db.select({ count: sql<number>`count(*)::int` }).from(articles);
    const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(comments);
    counts = { users: uc.count, blogs: bc.count, articles: ac.count, comments: cc.count };
  } catch {}

  return (
    <AdminPanel
      user={{ id: user.id, username: user.username, displayName: user.displayName, role: user.role }}
      counts={counts}
    />
  );
}
