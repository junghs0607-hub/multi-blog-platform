import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/notification-list";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "알림" };

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/notifications");
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 md:py-8">
      <h1 className="mb-4 px-1 text-2xl font-bold">알림</h1>
      <NotificationList />
    </div>
  );
}
