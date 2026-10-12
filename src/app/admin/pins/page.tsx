import type { Metadata } from "next";
import { AdminPins } from "@/components/admin/admin-pins";

export const metadata: Metadata = { title: "이미지 관리" };

export default function Page() {
  return <AdminPins />;
}
