import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <DashboardShell user={{ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role }}>
      {children}
    </DashboardShell>
  );
}
