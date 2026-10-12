import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PinCreateForm } from "@/components/pins/pin-form";
import { getViewer } from "@/server/auth/session";
import { env, UPLOAD_MAX_BYTES } from "@/server/env";
import { ALLOWED_MIME_TYPES } from "@/server/images/process";
import { listMyBoardOptions } from "@/server/services/boards";
import { listCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "핀 만들기" };

export default async function CreatePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/create");
  const [categories, boards] = await Promise.all([listCategories(), listMyBoardOptions(viewer)]);
  return (
    <PinCreateForm
      categories={categories}
      initialBoards={boards}
      config={{
        maxBytes: UPLOAD_MAX_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        minDimension: env.UPLOAD_MIN_DIMENSION,
        maxDimension: env.UPLOAD_MAX_DIMENSION,
      }}
    />
  );
}
