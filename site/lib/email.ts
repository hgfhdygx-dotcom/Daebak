// 알림 — SERVER ONLY (Resend 이메일 + 선택 웹훅). 키 없으면 graceful(skip). 클라이언트 import 금지.
// 분리 원칙:
//  · 새 질문 → 관리자 이메일(notifyAdminNewQuestion). 질문자에게 답장 가는 구조 아님(Reply-To 미설정).
//  · 질문자 → 답변 '발행 후'에만(= admin 의 Send notification 버튼, questions.py send_answer_email).
// 확장 포인트: sendEmail(replyTo) — 추후 'private email reply'(질문자에게 직접 답장) 기능에서만 사용.
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.QUESTION_FROM_EMAIL || "";

export function emailConfigured(): boolean {
  return Boolean(RESEND_KEY && FROM);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string; // 기본 미사용 — private reply 확장용
}): Promise<"sent" | "skipped" | "failed"> {
  if (!emailConfigured() || !opts.to) return "skipped";
  try {
    const body: Record<string, unknown> = { from: FROM, to: [opts.to], subject: opts.subject, text: opts.text };
    if (opts.replyTo) body.reply_to = opts.replyTo;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

// 새 질문 → 관리자에게 알림. 질문자 이메일/Reply-To 는 일부러 안 넣음(직접 답장 구조 기본 비활성).
export async function notifyAdminNewQuestion(q: {
  question: string;
  displayId?: string;
  intentGuess?: string;
  hasEmail: boolean;
}): Promise<void> {
  const to = process.env.QUESTION_NOTIFY_EMAIL || "";
  if (!emailConfigured() || !to) return;
  await sendEmail({
    to,
    subject: `New Daebak question${q.displayId ? ` (${q.displayId})` : ""}`,
    text:
      "New question in the Daebak inbox:\n\n" +
      `${q.displayId ? q.displayId + " — " : ""}${q.question}\n\n` +
      `Intent: ${q.intentGuess || "—"}  ·  Asker email: ${q.hasEmail ? "left one (will be notified on publish)" : "none"}\n\n` +
      "Open the admin 'Questions' inbox to review, draft, and publish an answer.\n" +
      "Note: do not reply to this email. After publishing, use the inbox 'Send notification' button to email the asker the answer link.\n",
    // replyTo 미설정 — 관리자가 이 메일에 답장해서 질문자에게 가는 구조를 기본으로 만들지 않음(요청대로).
  });
}

export async function fireWebhook(message: string): Promise<void> {
  const hook = process.env.QUESTION_WEBHOOK_URL || "";
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, text: message }),
    });
  } catch {
    /* ignore — 알림 실패가 제출을 막지 않음 */
  }
}
