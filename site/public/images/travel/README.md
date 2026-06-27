# Daebak 여행 이미지 (운영자용)

여기에 **영어 키워드 파일명**으로 사진을 넣으면, 관련 글/카테고리/클러스터에 **자동으로** 표시됩니다.
(파일이 없으면 깔끔한 **흰 패널 폴백**(흰 배경 + 아이콘)이 대신 보이므로, 비어 있어도 사이트는 안 깨집니다.)

## ▣ 인물 금지 (가장 중요)
이미지는 **사람이 없어야** 합니다. 프롬프트/선택 기본 규칙: **"no people, no faces, no human subjects".**
- **금지**: 사람 얼굴 · 인물 중심 · 군중 · 모델 · 셀카/패션샷 · 여행자 인물컷 · 광고형 인물.
- **허용**: 공항 내부 · AREX/지하철/버스/택시 외관 · 서울 스카이라인 · 거리/동네 풍경 · 교통수단 ·
  카드/티머니 등 결제 오브젝트 · 사람 없는 장소 풍경.

## 어느 레벨에 이미지가 보이나 (자동)
- **큰 카테고리(bigCategory)** 카드/허브 → `taxonomy.json` 의 `bigCategory.visualKey`
- **중간 카테고리(cluster)** 카드/페이지 → `taxonomy.json` 의 `cluster.visualKey`
- **작은 Q&A 카드(article)** → 기본은 **작은 아이콘 배지**(이미지 아님). 글에 `imageKey` 를 지정하고 관련도가 매우 높을 때만 썸네일.

즉, 큰/중간 카테고리까지만 이미지 중심이고, 작은 카드까지 전부 사진을 넣지 않습니다. (운영 난이도 ↓)

## 규칙
- 위치: `site/public/images/travel/`
- 파일명: 내용을 설명하는 **영어 슬러그**. 레지스트리(`site/lib/images.ts` 의 `imageRegistry[*].src`)에 적힌 이름과 정확히 일치해야 함.
- 포맷: jpg/png (Next.js가 자동으로 webp/avif 최적화). 가로형 권장(약 1600×900).
- alt/caption 은 코드(레지스트리)에서 영어로 관리됩니다 — 파일만 넣으면 됩니다.

### 지금 연결돼 있는 파일명 (이 이름으로 저장하면 즉시 점등)
| 파일명 | 쓰이는 곳 (visualKey / 문맥) |
| --- | --- |
| `seoul-skyline-view.jpg` | Travel·Local Places **큰 카테고리** + 홈 Hero 우측 |
| `incheon-airport-arrival.jpg` | **Airport & Arrival** 클러스터 + 공항 글 |
| `seoul-subway-platform.jpg` | **Seoul Transport** 클러스터 + 지하철 글 |
| `tmoney-card-subway-gate.jpg` | **T-money, WOWPASS & Payments** 클러스터 |
| `myeongdong-shopping-street.jpg` | **Seoul Stay & Neighborhoods** 클러스터 |
| `arex-train-seoul.jpg` | AREX 관련 글 |
| `incheon-airport-taxi.jpg` | 공항 택시 글 |
| `incheon-airport-limousine-bus.jpg` | 공항 버스 글 |

## 출처 (상업적 사용 무료, 출처표기 불필요)
- Unsplash / Pexels / Pixabay 에서 **다운로드해서** 위 파일명으로 저장. (외부 URL 직접 사용 금지 — 반드시 로컬 저장.)
- 또는 직접 촬영한 사진(독창적이라 GEO에 가장 유리). **사람이 안 나오게** 촬영/선택.

## 동작
- visualKey/imageKey 가 가리키는 파일이 실제로 있으면 → 그 사진 사용. 없으면 → 흰 패널 폴백(아이콘).
- 자동 매칭(글 문맥)도 점수≥80 & 파일 존재일 때만 사진. 엉뚱한 사진은 절대 들어가지 않음.
- 새 이미지를 더 쓰려면 `site/lib/images.ts` 의 `imageRegistry` 에 항목을 추가(인물 금지 규칙 준수).
- 새 카테고리/클러스터에 이미지를 붙이려면 `taxonomy.json` 에 `visualKey` 만 추가하면 됩니다.
