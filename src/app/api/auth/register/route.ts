import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, blogs, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createToken } from "@/lib/auth";
import { createSlug } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, displayName } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "모든 필드를 입력하세요." }, { status: 400 });
    }

    if (username.length < 2 || username.length > 30) {
      return NextResponse.json({ error: "사용자명은 2~30자로 입력하세요." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
    }

    const [existingUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUser) {
      return NextResponse.json({ error: "이미 사용 중인 사용자명입니다." }, { status: 400 });
    }

    const [existingEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
      role: "USER",
    }).returning();

    // Create blog
    const [blog] = await db.insert(blogs).values({
      userId: user.id,
      name: `${user.displayName || user.username}의 블로그`,
      slug: user.username,
      description: `${user.displayName || user.username}의 개인 블로그입니다.`,
      theme: "basic",
      themeSettings: { primaryColor: "#2563eb", fontFamily: "default", layout: "list", darkMode: false },
    }).returning();

    // Default categories
    await db.insert(categories).values([
      { blogId: blog.id, name: "일상", slug: "daily", sortOrder: 0 },
      { blogId: blog.id, name: "여행", slug: "travel", sortOrder: 1 },
      { blogId: blog.id, name: "IT/기술", slug: "tech", sortOrder: 2 },
    ]);

    const token = await createToken(user.id, user.role);

    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "회원가입에 실패했습니다." }, { status: 500 });
  }
}
