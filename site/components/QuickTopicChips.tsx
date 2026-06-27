import { Chip, ChipList } from "@/components/Chip";

// 카테고리 빠른 토픽 칩 — 모바일 horizontal scroll, 데스크탑 wrap. 데이터(navTopics) 기반.
export default function QuickTopicChips({ topics }: { topics: { label: string; href: string }[] }) {
  if (!topics.length) return null;
  return (
    <ChipList scroll className="mt-4">
      {topics.map((t, i) => (
        <Chip key={i} href={t.href} className="shrink-0 px-3.5 py-1.5 text-sm">
          {t.label}
        </Chip>
      ))}
    </ChipList>
  );
}
