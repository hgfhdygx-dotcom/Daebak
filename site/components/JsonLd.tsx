// 구조화 데이터 삽입 헬퍼. 보조용(엔티티 정합성) — 인용 무게는 보이는 본문이 진다.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
