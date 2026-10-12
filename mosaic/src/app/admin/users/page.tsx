import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-users";

export const metadata: Metadata = { title: "사용자 관리" };

export default function Page() {
  return <AdminUsers />;
}
