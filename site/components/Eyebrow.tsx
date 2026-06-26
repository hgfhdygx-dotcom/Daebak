// 라벨용 eyebrow — 대문자·흐린 색(에디토리얼 시그니처).
export default function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </p>
  );
}
