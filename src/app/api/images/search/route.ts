import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acquireBlogImages } from "@/lib/ai-images";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { query, alt } = await req.json();
    const keyword = typeof query === "string" ? query.trim() : "";
    if (!keyword) return NextResponse.json({ error: "이미지 검색어를 입력하세요." }, { status: 400 });

    const result = await acquireBlogImages({
      userId: user.id,
      topic: keyword,
      queries: [{ query: keyword, alt: typeof alt === "string" && alt.trim() ? alt.trim() : keyword }],
      settings: { imageProvider: "openverse", imageCount: 1 },
    });

    const image = result.images[0];
    if (!image) return NextResponse.json({ error: "사용 가능한 이미지를 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ success: true, image, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "이미지 검색에 실패했습니다." },
      { status: 500 },
    );
  }
}
