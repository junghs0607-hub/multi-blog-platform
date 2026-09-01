import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { media, blogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "image/jpeg", 
  "image/png", 
  "image/gif", 
  "image/webp", 
  "image/svg+xml", 
  "video/mp4", 
  "video/webm",
  "application/pdf"
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "파일을 선택하세요." }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG, MP4, WebM, PDF 지원)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "파일 크기는 10MB 이하만 가능합니다." }, { status: 400 });
    }

    const [blog] = await db.select().from(blogs).where(eq(blogs.userId, user.id)).limit(1);
    if (!blog) return NextResponse.json({ error: "블로그가 없습니다." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const fileName = `${uuidv4()}.${ext}`;
    
    // Store in /uploads directory (not public) - served via API route
    const uploadDir = path.join(process.cwd(), "uploads", blog.slug);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // URL via API route for serving files
    const url = `/api/uploads/${blog.slug}/${fileName}`;

    const [mediaRecord] = await db.insert(media).values({
      userId: user.id,
      blogId: blog.id,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      url,
    }).returning();

    return NextResponse.json({ success: true, url, media: mediaRecord });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }
}
