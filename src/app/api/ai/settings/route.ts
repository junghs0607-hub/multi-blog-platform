import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1);
  return NextResponse.json({ settings: settings || null });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const body = await req.json();
    const {
      provider,
      apiBaseUrl,
      apiKey,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      imageProvider,
      imageApiBaseUrl,
      imageApiKey,
      imageModel,
      imageCount,
    } = body;

    const [existing] = await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1);

    if (existing) {
      const [updated] = await db.update(aiSettings).set({
        provider,
        apiBaseUrl,
        apiKey,
        model,
        temperature: temperature ?? 7,
        maxTokens: maxTokens ?? 2000,
        systemPrompt,
        imageProvider: imageProvider || "openverse",
        imageApiBaseUrl: imageApiBaseUrl || null,
        imageApiKey: imageApiKey || null,
        imageModel: imageModel || "gpt-image-1",
        imageCount: Math.max(1, Math.min(Number(imageCount) || 3, 5)),
        updatedAt: new Date(),
      }).where(eq(aiSettings.id, existing.id)).returning();
      return NextResponse.json({ success: true, settings: updated });
    } else {
      const [created] = await db.insert(aiSettings).values({
        userId: user.id,
        provider,
        apiBaseUrl,
        apiKey,
        model,
        temperature: temperature ?? 7,
        maxTokens: maxTokens ?? 2000,
        systemPrompt,
        imageProvider: imageProvider || "openverse",
        imageApiBaseUrl: imageApiBaseUrl || null,
        imageApiKey: imageApiKey || null,
        imageModel: imageModel || "gpt-image-1",
        imageCount: Math.max(1, Math.min(Number(imageCount) || 3, 5)),
      }).returning();
      return NextResponse.json({ success: true, settings: created });
    }
  } catch (error) {
    return NextResponse.json({ error: "설정 저장에 실패했습니다." }, { status: 500 });
  }
}
