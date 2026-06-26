// 읽는 시간(분) 추정 — 분당 200단어 기준.
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
