// 클라이언트 방문자 ID(localStorage) — Good/댓글 중복 방지의 한 축(서버는 IP 해시와 함께 사용).
// 서버 전용 아님. 브라우저에서만 동작.
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let v = localStorage.getItem("daebak_vid");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("daebak_vid", v);
    }
    return v;
  } catch {
    return "";
  }
}
