# foreign-qa — 외국인 질문 1줄 → 영어 글 자동 발행

외국인이 묻는 **영어 질문 한 줄**을 넣으면
**리서치 → 본문 합성 → 영작·SEO → 미리보기 → (OK 누르면) 내 사이트에 발행 + 색인**까지
한 번에 이어주는 도구입니다. AI(ChatGPT·Gemini·Perplexity)가 **읽고 인용하기 좋은** 영어 글을
만들어, AI가 읽을 수 있는 **내 사이트**에 올립니다.

- **공식 API만** 사용(크롤링·자동 로그인·가짜 콘텐츠 0).
- **사람 승인 게이트**: 미리보기를 보고 **OK를 눌러야만** 발행됩니다.
- **가짜 정보 금지**: 확인 안 되는 가격·날짜·수상 등은 만들지 않고 `[VERIFY]`로 표시 → 사장님이 채운 뒤 발행.
- **비용 안전장치**: 발행 전 예상비용 표시 + 하루/한달 호출 한도 + 1편 상한.

폴더는 두 부분입니다:
- **루트(이 폴더)** = 글을 만드는 **도구**(Python + 웹앱).
- **`site/`** = AI가 읽는 **내 콘텐츠 사이트**(Next.js, Vercel 배포). 발행하면 여기에 글이 쌓입니다.

---

## 🟢 가장 쉬운 사용법 (글 만들기 — 평소엔 이 3개만)

| 순서 | 파일 | 하는 일 |
| :--: | --- | --- |
| 1️⃣ (한 번만) | **설치.bat** | 필요한 부품 설치 |
| 2️⃣ (한 번만) | **키입력.bat** | OpenAI 키 붙여넣기 (platform.openai.com/api-keys, 카드+소액충전) |
| 3️⃣ (쓸 때) | **웹사이트.bat** | 브라우저가 열림 → ② 질문 입력 → ③ 예상비용 → ④ 글 만들기 → ⑤ 미리보기 → ⑥ **OK 발행** |

> 💡 처음엔 질문 1개로 작게 시작해 연결·비용을 확인하세요.
> 🔒 키는 내 컴퓨터에만 저장됩니다(.env, 커밋 안 됨).

---

## 🌐 사이트 연결 (1회 설정 — 자동 발행을 켜려면)

이 설정을 하기 **전**에는 ⑥ OK를 눌러도 **"파일만 저장"**(글은 `site/content/answers/`에 안전 보관)됩니다.
아래를 한 번만 해두면, 그 다음부터는 OK 한 번에 **자동으로 사이트에 올라가고 색인**됩니다.

1. **사이트 부품 설치**: **사이트설치.bat** (Node.js 필요 — https://nodejs.org). 미리보기: **사이트미리보기.bat** → http://localhost:3000
2. **GitHub 저장소 만들기**(공개 무료): 이 `foreign-qa` 폴더를 깃 저장소로 올립니다.
   ```powershell
   cd D:\foreign-qa
   git init
   git add .
   git commit -m "init"
   gh repo create foreign-qa --public --source . --push    # (gh CLI) 또는 github.com에서 직접
   ```
3. **GitHub 토큰 입력**: github.com → Settings → Developer settings → **Fine-grained token**
   (이 저장소에 **Contents: Read and write** 권한만) → **깃토큰입력.bat** 에 붙여넣기.
4. **Vercel 연결**: vercel.com 로그인(GitHub로) → **Add New → Project** → 이 저장소 선택 →
   ⚠️ **Root Directory = `site`** 로 지정 → Deploy. 배포되면 주소(예: `https://foreign-qa.vercel.app`)가 나옵니다.
   - Vercel 프로젝트 **Settings → Environment Variables** 에 `NEXT_PUBLIC_SITE_URL = (그 주소)` 추가 → Redeploy.
5. **웹앱 ① 설정**에 같은 사이트 주소(SITE_URL)를 저장.
6. **IndexNow 키 만들기**: **사이트키생성.bat** (키를 `.env`와 `site/public/<키>.txt`에 동시 저장) → 다시 git push(또는 다음 발행 때 함께 올라감).

이제 ⑥ **OK 발행** = MDX 작성 → git push → Vercel 자동배포 → IndexNow(빙·네이버) 색인.

> ⚠️ **git 인증**: 토큰을 `깃토큰입력.bat`로 넣으면 푸시할 때 **로그인 창이 안 뜹니다**(토큰을 푸시 주소에만 사용).
> ⚠️ 발행 직후 사이트 반영까지 **배포에 1~2분** 걸릴 수 있어요.

---

## 🛡️ 안전·비용 (가장 중요)

| 장치 | 설명 |
| --- | --- |
| **발행 전 예상비용** | ③단계에서 "이 글 약 ○○원" + 남은 한도를 먼저 보여줌(무료). |
| **하루/한달 한도** | `config.py` `DAILY_LIMIT`(50)·`MONTHLY_LIMIT`(1000) 초과 시 실행 차단. 성공 호출만 카운트. |
| **1편 상한** | `MAX_COST_PER_RUN_KRW`(10000원) 넘으면 차단. |
| **사람 승인** | 미리보기 → **OK를 눌러야만** 발행. 자동으로 안 올라감. |
| **가짜 금지** | 확인 불가는 `[VERIFY]` 표시 → 사장님이 채운 뒤 발행. 없는 수상·가격·통계 안 만듦. |
| **원자적 저장** | 글·기록 파일은 안전하게 저장(깨진 파일 덮어쓰기 방지). |

---

## ✍️ 왜 이렇게 만드나 (GEO 원리, 짧게)

- **AI는 robots.txt로 막힌 글을 못 읽어요.** 그래서 `site/`는 GPTBot·ClaudeBot·PerplexityBot·Google-Extended 등을 **명시적으로 허용**합니다(`site/app/robots.ts`).
- **AI는 JS를 실행 안 해요.** Next.js App Router는 **서버 렌더(SSR)** 라 크롤러가 본문을 그대로 읽습니다.
- 글은 **답변 우선(두괄식)** + 상단 **Citation Pack**(복붙용 요약) + **FAQ**(질문 그림자) + **출처** + **날짜** 형식 — AI가 인용하기 좋은 구조로 자동 생성합니다.
- 자세한 기법은 측정 도구(`D:\geo-tracker`)의 `ai가 좋아하는 글.md` 참고.

---

## ❓ 문제 해결

| 증상 | 해결 |
| --- | --- |
| "OpenAI 키 없음" | **키입력.bat** 으로 `sk-` 키 입력. |
| ⑥에서 "파일만 저장됨" | 위 **사이트 연결(1회 설정)** 을 안 했거나 GitHub 토큰이 없음. |
| 발행했는데 사이트에 안 보임 | Vercel **배포 1~2분** 대기. Vercel 대시보드에서 배포 상태 확인. |
| `site` 미리보기 오류 | **사이트설치.bat** 먼저(Node.js 필요). |
| 색인이 안 됨 | IndexNow는 **빙·네이버**만 지원(구글은 sitemap으로 발견). 키 파일(`site/public/<키>.txt`)이 배포됐는지 확인. |

> 📌 **2026 참고**: 티스토리·미디엄 **발행 API는 폐지**돼서 내 사이트 방식을 씁니다.
> IndexNow는 **Bing·Naver** 지원. WordPress/Ghost/dev.to는 공식 API가 있어 나중에 어댑터로 추가 가능.
