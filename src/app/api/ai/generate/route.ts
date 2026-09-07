import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiSettings, aiLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { YoutubeTranscript } from "@/lib/youtube-transcript";
import {
  acquireBlogImages,
  injectImagesIntoContent,
  normalizeImageQueries,
} from "@/lib/ai-images";

function extractJson(raw: string): unknown {
  let json = raw.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) json = fenced[1].trim();
  try {
    return JSON.parse(json);
  } catch {
    const objectStart = json.indexOf("{");
    const objectEnd = json.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(json.slice(objectStart, objectEnd + 1));
    }
    throw new Error("AI 응답의 JSON 형식을 해석할 수 없습니다.");
  }
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const { type, prompt, content, includeImages } = await req.json();
    if (!prompt?.trim() && !content?.trim()) {
      return NextResponse.json({ error: "주제 또는 내용을 입력하세요." }, { status: 400 });
    }

    const [settings] = await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1);
    const provider = settings?.provider || "openai";
    const apiKey = settings?.apiKey || process.env.OPENAI_API_KEY || "";
    const baseUrl = (settings?.apiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = settings?.model || "gpt-3.5-turbo";
    const temperature = (settings?.temperature ?? 7) / 10;
    let maxTokens = settings?.maxTokens || 4000;
    if ((type === "write" || type === "youtube") && maxTokens < 4000) {
      maxTokens = 4000;
    }
    const imageCount = Math.max(1, Math.min(settings?.imageCount || 3, 5));
    const systemPrompt = settings?.systemPrompt ||
      "당신은 한국어 블로그 글 작성을 돕는 전문 AI 어시스턴트입니다. 매력적이고 읽기 쉬운 글을 작성합니다.";

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI API 키가 설정되지 않았습니다. 대시보드 > AI 설정에서 API 키를 등록하세요." },
        { status: 400 },
      );
    }

    let userPrompt = "";
    let extractedTopic = String(prompt || "");

    switch (type) {
      case "write": {
        const imageField = includeImages !== false
          ? `,
  "imageQueries": [
    {"query":"영문 이미지 검색어 1","alt":"한국어 대체 텍스트","caption":"한국어 캡션"},
    {"query":"영문 이미지 검색어 2","alt":"한국어 대체 텍스트","caption":"한국어 캡션"}
  ]`
          : "";
        userPrompt = `다음 주제로 매력적인 한국어 블로그 글을 작성해주세요.

주제: ${prompt}

[중요: JSON 형식 및 문법 규칙]
- 다른 설명이나 마크다운 코드펜스(\`\`\`) 없이 순수한 JSON 객체만 응답하세요.
- 모든 키(Key)와 문자열 값(Value)은 큰따옴표(")로 감싸야 합니다.
- HTML content 안에 들어가는 속성의 큰따옴표(예: <p class="text">)는 반드시 백슬래시(\\)로 이스케이프(\\") 처리하세요.
- JSON 문자열 값 내부에 실제 줄바꿈(엔터)을 넣지 마세요. 줄바꿈이 필요하면 반드시 "\\n" 문자를 사용하세요.

응답할 JSON 구조:
{
  "title": "매력적인 제목",
  "subtitle": "부제목",
  "summary": "2-3문장의 요약",
  "content": "HTML 형식의 본문",
  "seoTitle": "SEO 제목 (60자 이내)",
  "seoDescription": "SEO 설명 (160자 이내)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]${imageField}
}

본문(content) 작성 규칙:
- 최소 800자 이상 작성하세요.
- h2, h3, p, strong, ul, li, blockquote 태그를 활용하세요.
- 소제목과 문단을 명확하게 구분하세요.
- content 안에 img 태그나 존재하지 않는 이미지 URL을 절대 만들지 마세요.
${includeImages !== false ? `- imageQueries는 본문의 서로 다른 장면을 표현하는 ${imageCount}개의 구체적인 영문 사진 검색어로 작성하세요.` : ""}
- 이미지 파일 확보와 본문 배치는 서버가 별도로 처리합니다.`;
        break;
      }
      case "youtube": {
        const url = String(prompt).trim();
        let transcriptText = "";
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          transcriptText = transcript.map(t => t.text).join(" ");
        } catch (e) {
          return NextResponse.json({ error: "유튜브 자막을 추출할 수 없습니다. 영상에 자막이 없거나 URL이 잘못되었을 수 있습니다." }, { status: 400 });
        }
        
        extractedTopic = "유튜브 영상 요약 및 분석";
        const imageField = includeImages !== false
          ? `,
  "imageQueries": [
    {"query":"영문 이미지 검색어 1","alt":"한국어 대체 텍스트","caption":"한국어 캡션"}
  ]`
          : "";
        
        userPrompt = `다음은 유튜브 영상의 자막 내용입니다. 이 내용을 바탕으로 독자들이 흥미를 가질 만한 매력적인 한국어 블로그 글을 작성해주세요.

자막 내용: ${transcriptText.substring(0, 7000)}

[중요: JSON 형식 및 문법 규칙]
- 다른 설명이나 마크다운 코드펜스(\`\`\`) 없이 순수한 JSON 객체만 응답하세요.
- 모든 키(Key)와 문자열 값(Value)은 큰따옴표(")로 감싸야 합니다.
- HTML content 안에 들어가는 속성의 큰따옴표(예: <a href="url">)는 반드시 백슬래시(\\)로 이스케이프(\\") 처리하세요.
- JSON 문자열 값 내부에 실제 줄바꿈(엔터)을 넣지 마세요. 줄바꿈이 필요하면 반드시 "\\n" 문자를 사용하세요.

응답할 JSON 구조:
{
  "title": "매력적인 제목",
  "subtitle": "부제목",
  "summary": "2-3문장의 요약",
  "content": "HTML 형식의 본문",
  "seoTitle": "SEO 제목 (60자 이내)",
  "seoDescription": "SEO 설명 (160자 이내)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]${imageField}
}

본문(content) 작성 규칙:
- 최소 800자 이상 작성하세요.
- 단순히 자막을 나열하지 말고, 서론-본론-결론이 있는 블로그 포스팅 형식으로 재구성하세요.
- h2, h3, p, strong, ul, li, blockquote 태그를 적극적으로 활용하세요.
- content 안에 img 태그나 존재하지 않는 이미지 URL을 절대 만들지 마세요.
${includeImages !== false ? `- imageQueries는 본문의 서로 다른 장면을 표현하는 ${imageCount}개의 구체적인 영문 사진 검색어로 작성하세요.` : ""}
- 이미지 파일 확보와 본문 배치는 서버가 별도로 처리합니다.`;
        break;
      }
      case "title":
        userPrompt = `다음 내용에 대한 매력적인 블로그 제목 5개를 JSON 배열로만 응답하세요.\n\n내용: ${prompt}`;
        break;
      case "summary":
        userPrompt = `다음 글의 핵심을 3-4문장의 한국어로 요약하세요. 요약문만 응답하세요.\n\n${content || prompt}`;
        break;
      case "improve":
        userPrompt = `다음 문장을 더 자연스럽고 매력적인 한국어로 개선하세요. 개선된 문장만 응답하세요.\n\n${content || prompt}`;
        break;
      case "tags":
        userPrompt = `다음 글에 적합한 한국어 태그 5-10개를 JSON 문자열 배열로만 응답하세요.\n\n${content || prompt}`;
        break;
      case "seo":
        userPrompt = `다음 글의 SEO 정보를 {"seoTitle":"60자 이내","seoDescription":"160자 이내"} JSON으로만 응답하세요.\n\n${content || prompt}`;
        break;
      default:
        userPrompt = prompt || content;
    }

    const requestBody: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (provider === "openai" && (type === "write" || type === "youtube" || type === "seo")) {
      requestBody.response_format = { type: "json_object" };
    }

    const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const detail = await apiResponse.text();
      console.error("AI API error:", detail);
      return NextResponse.json(
        { error: `AI API 호출에 실패했습니다. (${apiResponse.status})` },
        { status: 502 },
      );
    }

    const data = await apiResponse.json();
    const resultText = data.choices?.[0]?.message?.content || "";
    const tokensUsed = data.usage?.total_tokens || 0;

    await db.insert(aiLogs).values({
      userId: user.id,
      provider,
      model,
      prompt: userPrompt.substring(0, 500),
      response: resultText.substring(0, 2000),
      tokensUsed,
    });

    if (type !== "write" && type !== "youtube") {
      return NextResponse.json({ success: true, result: resultText, tokensUsed });
    }

    try {
      const parsed = extractJson(resultText) as Record<string, unknown>;
      let generatedImages: Awaited<ReturnType<typeof acquireBlogImages>>["images"] = [];
      let imageWarnings: string[] = [];

      if (includeImages !== false) {
        const queries = normalizeImageQueries(parsed.imageQueries, extractedTopic, imageCount);
        const imageResult = await acquireBlogImages({
          userId: user.id,
          topic: extractedTopic,
          queries,
          settings: {
            imageProvider: settings?.imageProvider,
            imageApiBaseUrl: settings?.imageApiBaseUrl,
            imageApiKey: settings?.imageApiKey,
            imageModel: settings?.imageModel,
            imageCount,
          },
        });
        generatedImages = imageResult.images;
        imageWarnings = imageResult.warnings;
        parsed.content = injectImagesIntoContent(String(parsed.content || ""), generatedImages);
        parsed.thumbnailUrl = generatedImages[0]?.url || "";
        parsed.images = generatedImages;
        parsed.imageWarnings = imageWarnings;
      }

      return NextResponse.json({
        success: true,
        result: resultText,
        parsed,
        images: generatedImages,
        imageWarnings,
        tokensUsed,
        type: "structured",
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        result: resultText,
        tokensUsed,
        type: "raw",
        parseError: error instanceof Error ? error.message : "JSON 파싱 실패",
      });
    }
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: `AI 생성에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}` },
      { status: 500 },
    );
  }
}
