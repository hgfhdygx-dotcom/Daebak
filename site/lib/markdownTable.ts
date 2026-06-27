export type ParsedTable = { headers: string[]; rows: string[][] };

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

// 셀의 마크다운 흔적 정리(옵션 카드는 평문으로 표시).
export function cleanCell(s: string): string {
  return (s || "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [t](u) -> t
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **x** -> x
    .replace(/[*_`]/g, "")
    .trim();
}

// 본문 markdown에서 첫 GFM 표를 추출하고, 그 표를 제거한 본문을 함께 반환.
export function extractFirstTable(md: string): {
  table: ParsedTable | null;
  body: string;
} {
  const lines = (md || "").split("\n");
  const rowRe = /^\s*\|.*\|\s*$/;
  const sepRe = /^\s*\|[\s:|-]+\|\s*$/;
  for (let i = 0; i < lines.length - 1; i++) {
    if (rowRe.test(lines[i]) && sepRe.test(lines[i + 1])) {
      let j = i + 2;
      while (j < lines.length && rowRe.test(lines[j])) j++;
      const headers = splitRow(lines[i]).map(cleanCell);
      const rows = lines.slice(i + 2, j).map((l) => splitRow(l).map(cleanCell));
      const body = [...lines.slice(0, i), ...lines.slice(j)]
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return { table: { headers, rows }, body };
    }
  }
  return { table: null, body: md };
}
