import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getViewer } from "@/server/auth/session";
import { getMyAccount } from "@/server/services/users";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  const account = await getMyAccount(viewer);
  return <SettingsView key={account.username + account.avatarUrl} account={account} />;
}
