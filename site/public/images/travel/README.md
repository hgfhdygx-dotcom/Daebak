# Daebak 여행 이미지 (운영자용)

여기에 **영어 키워드 파일명**으로 사진을 넣으면, 관련 글/허브에 **자동으로** 표시됩니다.
(파일이 없으면 깔끔한 폴백 일러스트가 대신 보이므로, 비어 있어도 사이트는 안 깨집니다.)

## 규칙
- 위치: `site/public/images/travel/`
- 파일명: 내용을 설명하는 **영어 슬러그**. 레지스트리(`site/lib/images.ts` 의 `imageRegistry[*].src`)에 적힌 이름과 정확히 일치해야 함.
  - 예: `incheon-airport-arrival.jpg`, `arex-train-seoul.jpg`, `seoul-subway-platform.jpg`, `myeongdong-shopping-street.jpg`, `seoul-skyline-view.jpg`, `tmoney-card-subway-gate.jpg`, `incheon-airport-taxi.jpg`, `incheon-airport-limousine-bus.jpg`
- 포맷: jpg/png (Next.js가 자동으로 webp/avif 최적화). 가로형 권장(약 1600×900).
- alt/caption 은 코드(레지스트리)에서 영어로 관리됩니다 — 파일만 넣으면 됩니다.

## 출처 (상업적 사용 무료, 출처표기 불필요)
- Unsplash / Pexels / Pixabay 에서 **다운로드해서** 위 파일명으로 저장. (외부 URL 직접 사용 금지 — 반드시 로컬 저장.)
- 또는 직접 촬영한 사진(독창적이라 GEO에 가장 유리).

## 동작
- 글 문맥(제목/질문/요약/장소/카테고리/클러스터/pageType)과 레지스트리 태그가 충분히 맞고(점수≥80) 파일이 실제로 있으면 → 그 사진 사용.
- 아니면 → 폴백 일러스트(그라데이션 + 여행 아이콘). 엉뚱한 사진은 절대 들어가지 않음.
- 새 이미지를 더 쓰려면 `site/lib/images.ts` 의 `imageRegistry` 에 항목을 추가하세요.
