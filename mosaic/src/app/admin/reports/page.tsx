import type { Metadata } from "next";
import { AdminReports } from "@/components/admin/admin-reports";

export const metadata: Metadata = { title: "신고 관리" };

export default function Page() {
  return <AdminReports />;
}
