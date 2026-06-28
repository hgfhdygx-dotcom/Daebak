# Daebak 이미지 (운영자용)

카테고리·클러스터 대표 비주얼은 이제 **admin 콘솔의 🖼 Image Manager (Unsplash)** 로 관리합니다.
직접 파일을 넣을 필요가 없습니다.

## 어떻게 동작하나 (Unsplash hotlink)
- admin → **🖼 Image Manager** 에서 카테고리/클러스터를 고르고 → Unsplash 후보를 불러와 → **Apply**.
- 사진은 **다운로드하지 않고** Unsplash 가 준 URL(`photo.urls`)을 그대로 **hotlink** 로 표시합니다
  (Unsplash API Guidelines 준수). Apply 시 Unsplash **download 가 트리거**되고, 사진가 **attribution**
  ("Photo by … on Unsplash" + UTM)이 함께 저장됩니다.
- 승인 결과는 `site/content/visuals.json` 한 곳에 저장되고, 사이트가 빌드 시 읽어 표시합니다.
- 어디에 보이나: **홈 Hero · bigCategory 카드 · CategoryHero · ClusterCard · cluster 비주얼**.
  작은 **Q&A 답변 카드**에는 기본적으로 큰 사진을 넣지 않습니다(작은 아이콘 배지).
- 적용 안 된 곳은 **흰 패널 폴백**(흰 배경 + 아이콘)이라 비어 있어도 사이트가 안 깨집니다.

## 인물 규칙 (완화됨)
- **허용**: 장소/사물 중심이면 사람이 일부 있어도 됨(피사체만 아니라면). 공항·지하철·거리·결제 오브젝트 등.
- **지양**: 얼굴 클로즈업 · 모델/셀카/인물 포트레이트 · 광고형 인물. 군중은 우선순위 ↓.

## 이 폴더(`site/public/images/travel/`)는 선택/레거시
- 더는 필수가 아닙니다. (이전 로컬-다운로드 방식의 잔여 파일이 있을 수 있으나 기본 경로에서 참조하지 않음.)
- 굳이 **로컬 파일**을 쓰고 싶을 때만: `site/lib/images.ts` 의 `imageRegistry` 키로 연결하고 글에 `imageKey` 지정.
- 외부 이미지 제공자는 **Unsplash 단일**입니다(Pexels 등 제거됨).
