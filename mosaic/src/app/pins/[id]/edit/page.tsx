import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PinEditForm } from "@/components/pins/pin-form";
import { getViewer } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { getPinDetail } from "@/server/services/pins";

export const metadata: Metadata = { title: "핀 수정" };

export default async function EditPinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/pins/${id}/edit`);
  const pinId = Number(id);
  const pin = Number.isSafeInteger(pinId) && pinId > 0 ? await getPinDetail(pinId, viewer) : null;
  // 작성자만 수정 가능 (권한이 없으면 존재 여부를 노출하지 않음)
  if (!pin || !pin.viewer.isOwner) notFound();
  return <PinEditForm pin={pin} categories={await listCategories()} />;
}
