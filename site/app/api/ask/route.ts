import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createQuestion,
  validateSubmission,
  isConfigured,
  guessIntent,
  diagnose,
  RateLimitError,
  NotConfiguredError,
  type CreateQuestionInput,
} from "@/lib/questions";
import { notifyAdminNewQuestion, fireWebhook } from "@/lib/email";

export const runtime = "nodejs"; // node:crypto 필요(edge 불가)
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const question = str(body.question) || "";
  const website = str(body.website); // honeypot

  const v = validateSubmission({ question, website });
  if (!v.ok) {
    // 봇이 honeypot 을 채운 경우: 성공한 척(저장 안 함) → 봇에게 힌트 안 줌
    if (v.reason === "spam") return NextResponse.json({ ok: true, spam: true });
    return NextResponse.json({ ok: false, error: v.reason }, { status: 400 });
  }
  // /ask 페이지는 이메일 필수(requireEmail). 홈 히어로는 선택.
  const email = str(body.email);
  if (body.requireEmail === true && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
  }
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const input: CreateQuestionInput = {
    question,
    email: str(body.email),
    name: str(body.name),
    notifyOnAnswer: body.notifyOnAnswer === true,
    categoryGuess: str(body.categoryGuess),
    language: str(body.language),
    sourcePage: str(body.sourcePage),
    sourceComponent: (str(body.sourceComponent) as CreateQuestionInput["sourceComponent"]) || "home_search",
    ip: clientIp(req),
  };

  try {
    const { publicToken, statusPath, displayId } = await createQuestion(input);
    // 새 질문 알림: ① 관리자 이메일(Resend) ② (선택) 웹훅. 질문자에게는 '발행 후'에만(admin 의 Send notification).
    // 서버리스는 응답 후 비동기를 못 끝낼 수 있어 await(실패해도 제출 자체는 성공으로 응답).
    await Promise.allSettled([
      notifyAdminNewQuestion({
        question,
        displayId,
        intentGuess: guessIntent(question),
        hasEmail: Boolean(input.email),
      }),
      fireWebhook(`New Daebak question ${displayId}: ${question.slice(0, 300)}`),
    ]);
    return NextResponse.json({ ok: true, publicToken, statusPath, displayId });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    if (e instanceof NotConfiguredError) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    console.error("[/api/ask] submit failed:", e); // Vercel 함수 로그에서 실제 원인(예: supabase insert 401) 확인
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// 진단용 — 브라우저에서 /api/ask 를 열면 설정/연결/테이블 상태를 JSON 으로 보여줌(키·데이터 노출 없음).
export async function GET() {
  return NextResponse.json(await diagnose());
}
