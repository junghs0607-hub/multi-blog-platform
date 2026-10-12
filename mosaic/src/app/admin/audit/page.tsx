import type { Metadata } from "next";
import { AdminAudit } from "@/components/admin/admin-audit";

export const metadata: Metadata = { title: "감사로그 관리" };

export default function Page() {
  return <AdminAudit />;
}
