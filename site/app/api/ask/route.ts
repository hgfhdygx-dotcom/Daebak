import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createQuestion,
  validateSubmission,
  isConfigured,
  RateLimitError,
  NotConfiguredError,
  type CreateQuestionInput,
} from "@/lib/questions";

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
    const { publicToken, statusPath } = await createQuestion(input);
    // (선택) 새 질문 즉시 알림 — Discord/Slack 호환. 실패해도 절대 막지 않음(fire-and-forget).
    const hook = process.env.QUESTION_WEBHOOK_URL;
    if (hook) {
      const msg = `New Daebak question: ${question.slice(0, 300)}`;
      fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg, text: msg }),
      }).catch(() => {});
    }
    return NextResponse.json({ ok: true, publicToken, statusPath });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    if (e instanceof NotConfiguredError) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
