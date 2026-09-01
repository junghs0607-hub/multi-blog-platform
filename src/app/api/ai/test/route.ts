import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { provider, apiBaseUrl, apiKey, model } = await req.json();

    if (!apiKey) return NextResponse.json({ error: "API 키를 입력하세요." }, { status: 400 });

    const baseUrl = apiBaseUrl || "https://api.openai.com/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello! Say 'Connection successful!' in Korean." }],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `API 연결 실패: ${response.status}`, details: errText }, { status: 400 });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "응답 없음";

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: "연결 테스트 실패: " + (error.message || "") }, { status: 500 });
  }
}
