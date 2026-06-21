# AI Blog Generator - claude.md

## 프로젝트 개요

한국어 블로그 콘텐츠 생성 및 SNS 콘텐츠 제작을 지원하는 AI 기반 웹 애플리케이션입니다.

### 주요 기능 (현재 구현 상태)
- ✅ SEO 최적화 블로그 포스트 자동 생성 (마크다운)
- ✅ AI 이미지 프롬프트/생성 (Midjourney 프롬프트, Google Imagen, Gemini)
- ✅ Instagram 콘텐츠 프레임 생성 · 텍스트 풀 관리 · 히스토리
- ✅ 콘텐츠 히스토리 관리 (Supabase)
- ✅ 멀티 AI 프로바이더 (Claude / OpenAI / Gemini) 전환
- ✅ 사용자 인증 (Supabase Magic Link), 다크모드
- 🚧 **Threads 자동 포스팅 — 미완성 (개발 중단). 신규 기획·재구현 필요. 아래 "Threads (미완성)" 참고**

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite 6
- **Routing**: react-router-dom 7 (`components/AppRouter.tsx` 중심)
- **상태관리**: React Context (`contexts/`) + 커스텀 훅 (`hooks/`)
- **AI**: 멀티 프로바이더
  - Anthropic Claude (`@anthropic-ai/sdk`)
  - OpenAI GPT (`openai`)
  - Google Gemini (`@google/genai`) — 이미지 생성(Imagen/Gemini)도 담당
- **Backend**: Supabase (Auth, Database, Storage)
- **Deployment**: Vercel (GitHub push 시 자동 배포)
- **Styling**: CSS 변수 기반 (다크모드, 모노크롬 Swiss-grid — `DESIGN.md` 참고)

## 프로젝트 구조

```
/
├── components/                 # React 컴포넌트
│   ├── AppRouter.tsx           # 라우팅 (lazy load + Suspense)
│   ├── Sidebar.tsx             # 사이드바 네비게이션
│   ├── Header.tsx              # 헤더
│   ├── MainBlogAssistant.tsx   # 메인 블로그 생성 UI
│   ├── BlogPostDisplay.tsx     # 생성된 블로그 렌더링/복사/다운로드
│   ├── BlogSourcesDisplay.tsx  # 참고자료 출처
│   ├── GeneratedImagesDisplay.tsx
│   ├── SuggestionSelector.tsx
│   ├── ContentHistoryPage.tsx  # 콘텐츠 히스토리
│   ├── AISettingsPage.tsx      # AI 프로바이더/모델/키 설정
│   ├── PromptSettingsPage.tsx  # 프롬프트 템플릿 커스터마이징
│   ├── DarkModeSettings.tsx
│   ├── SNSManagement.tsx
│   ├── AuthPage.tsx            # 로그인 (Magic Link)
│   ├── Instagram*.tsx          # Instagram 기능 컴포넌트군 (Generator/History/TextPool/Preview/Editor 등)
│   ├── InstaContentFrame.tsx
│   ├── ThreadsAutoPosting.tsx  # 🚧 Threads UI (미완성, 3500+줄)
│   ├── ThreadsAuthCallback.tsx # Threads OAuth 콜백
│   ├── ui/                     # 재사용 UI (Button, Card, Badge)
│   ├── IconComponents.tsx      # 공용 SVG 아이콘
│   └── ...
├── contexts/                   # 전역 상태
│   ├── AuthContext.tsx
│   ├── AISettingsContext.tsx   # AI 키/프로바이더/모델/템플릿
│   └── DarkModeContext.tsx
├── hooks/                      # 커스텀 훅
│   ├── useAuth.ts
│   ├── useAISettings.ts        # 키/프로바이더/모델 (localStorage + Supabase 동기화)
│   ├── useBlogGeneration.ts    # 블로그 생성 + 이미지 생성 오케스트레이션
│   ├── useInstagramContentState.ts
│   ├── useInstagramImageCapture.ts  # html-to-image 캡처
│   └── useUserCategories.ts
├── services/                   # API · 비즈니스 로직
│   ├── anthropicService.ts     # Claude API
│   ├── openaiService.ts        # GPT API
│   ├── geminiService.ts        # Gemini API + 이미지 생성(Imagen/Midjourney 프롬프트/NanoBanana)
│   ├── authService.ts          # Supabase 인증
│   ├── historyService.ts       # 콘텐츠 히스토리 CRUD
│   ├── instagramService.ts     # Instagram 포스트 CRUD/업로드
│   ├── instagramTextPoolService.ts
│   ├── settingsService.ts      # 사용자 설정 CRUD
│   └── threadsService.ts       # 🚧 Threads API (미완성 기능의 일부)
├── lib/
│   └── supabase.ts             # Supabase 클라이언트
├── api/                        # Vercel 서버리스 함수
│   └── threads/                # Threads OAuth/콜백 (token, exchange-token, profile, deauthorize*, deletion*)
├── App.tsx                     # 루트 (Provider 조합)
├── index.tsx                   # 엔트리 (BrowserRouter, DarkModeProvider)
├── types.ts                    # 공유 타입
├── constants.ts                # 프로바이더/모델 설정(SUB_MODEL_CONFIG), 기본 프롬프트
├── styles.css                  # 전역 스타일
└── supabase-schema.sql         # 통합 DB 스키마 (단일 정식 파일)

* deauthorize.ts / deletion.ts 는 Meta 필수 콜백이지만 현재 TODO 스텁 상태.
```

## 핵심 워크플로우

### 1. 블로그 포스트 생성
1. 지역/카테고리 입력 → SEO 주제 제안 생성
2. 주제 선택 → 키워드/타겟독자/인사이트 제안
3. 참고자료 추가 (URL, 파일 업로드)
4. 블로그 포스트 생성 (마크다운)
5. 이미지 생성 (Midjourney 프롬프트 / Imagen / Gemini)

생성 로직은 `hooks/useBlogGeneration.ts`가 오케스트레이션하며, 선택된 프로바이더에 따라 `anthropicService` / `openaiService` / `geminiService`로 라우팅됩니다.

### 2. AI 이미지 생성 (Gemini 전용)
- **Midjourney**: 프롬프트만 생성 (외부 플랫폼에서 사용)
- **Imagen**: `imagen-4.0-fast-generate-001` 직접 호출, 지수 백오프 재시도
- **Gemini (NanoBanana)**: `generateImageWithNanoBanana`

### 3. Instagram 콘텐츠
- 콘텐츠 프레임 생성 및 미리보기, html-to-image 캡처
- 텍스트 풀(`instagram_text_pool`) 관리로 질문/캡션 풀 운영
- 포스트 히스토리 저장/복원 (`instagram_posts`)

### 4. 콘텐츠 히스토리
- Supabase `content_history`에 저장/복원/삭제
- 타입별 필터 (blog / instagram / threads)

## AI 모델 관리

- 프로바이더는 **AI 설정 페이지**에서 선택 (Claude / OpenAI / Gemini).
- 각 프로바이더의 메인/서브 모델은 `constants.ts`의 `SUB_MODEL_CONFIG`에 정의.
- API 키는 **환경 변수가 아니라 앱 UI에서 입력** → `useAISettings`가 localStorage + Supabase(`user_settings.ai_settings`)에 저장/동기화.
- Gemini는 쿼터 초과 시 Pro → Flash 폴백 로직 보유.
- 에러 처리: 각 서비스가 사용자 친화적 메시지로 변환 (쿼터/rate limit/키 오류 등).

## Threads (미완성) 🚧

Threads 자동 포스팅은 **구현하다 중단된 미완성 기능**입니다. 새로 기획·재구현이 필요합니다.

현재 코드 상태:

| 구성 | 파일 | 상태 |
|------|------|------|
| OAuth/토큰/프로필 연동 | `api/threads/token.ts`, `exchange-token.ts`, `profile.ts`, `services/threadsService.ts`, `components/ThreadsAuthCallback.tsx` | 동작하는 편 — 재사용 가치 있음 |
| Meta 필수 콜백 | `api/threads/deauthorize.ts`, `deletion.ts` | TODO 스텁 (미구현) |
| 자동 포스팅 UI | `components/ThreadsAutoPosting.tsx` (3500+줄) | 페르소나·스케줄·분석이 뒤섞인 미완성 거대 컴포넌트 — **재기획 대상** |

> 재구현 시: OAuth/API 배관은 참조·재사용하고, `ThreadsAutoPosting.tsx`는 기능 범위를 새로 정의한 뒤 분할 설계하는 것을 권장. `threads_tokens`는 `user_settings`에 이미 저장됩니다.

## 환경 변수

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Threads API (미완성 기능)
VITE_THREADS_APP_ID=your_threads_app_id
VITE_THREADS_APP_SECRET=your_threads_app_secret
VITE_THREADS_REDIRECT_URI=http://localhost:5173/auth/threads/callback
```

> **AI API 키(Claude/OpenAI/Gemini)는 `.env`에 두지 않습니다.** 앱의 AI 설정 페이지에서 입력합니다. 자세한 변수는 `.env.example` 참고.

## 데이터베이스 (Supabase)

`supabase-schema.sql` 한 파일이 통합 셋업(재실행 안전). 생성되는 테이블:

- `content_history` — 생성 콘텐츠
- `user_settings` — AI 설정, 프롬프트 템플릿(JSONB), SNS 채널, `threads_tokens`
- `instagram_posts`, `instagram_accounts` — Instagram
- `instagram_text_pool` — Instagram 텍스트 풀
- Storage 버킷: `instagram-backgrounds`, `instagram-posts`

인증은 Magic Link, 모든 테이블에 RLS 적용 (자세한 내용은 `SUPABASE_SETUP.md`).

> 레거시 `saved_prompt_templates` 테이블은 제거됨. 기존 DB 정리는 `cleanup-unused-tables.sql` 사용.

## 개발 명령어

```bash
npm run dev          # 개발 서버 (포트 5173)
npm run type-check   # 타입 체크 (tsc --noEmit)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
```

## 코드 수정 가이드라인

1. **컴포넌트**: 기능별 분리 유지. 거대 컴포넌트(ThreadsAutoPosting)는 재기획 시 분할.
2. **상태**: 전역은 `contexts/`, 화면 로직은 `hooks/`로.
3. **서비스**: API 호출·비즈니스 로직은 `services/`에 집중.
4. **타입**: 공유 타입은 `types.ts`.
5. **AI 호출**: 쿼터/rate limit 고려, 프로바이더별 서비스 경유.
6. **보안**: AI 키는 UI 입력, 기타 비밀값은 환경 변수/Vercel 대시보드.

## 알려진 이슈 및 제한사항

- Gemini Pro 쿼터 제한 → Flash 폴백.
- Imagen rate limiting (재시도 로직으로 처리).
- Threads 자동 포스팅 미완성 (재기획 필요).
- `services/anthropicService.ts`·`openaiService.ts`·`geminiService.ts`는 구조가 유사 — 향후 공통 베이스 추출 여지 있음.

## 참고 문서

- [README.md](./README.md): 프로젝트 소개 및 로컬 실행
- [DESIGN.md](./DESIGN.md): UI 디자인 시스템
- [DEPLOYMENT.md](./DEPLOYMENT.md): Vercel 배포
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md): Supabase 설정/스키마
- [THREADS_API_SETUP.md](./THREADS_API_SETUP.md): Threads API 설정 (미완성 기능)
- [META_CALLBACK_URLS.md](./META_CALLBACK_URLS.md): Meta 콜백 URL
- [INSTAGRAM_CRON_SETUP.md](./INSTAGRAM_CRON_SETUP.md): Instagram 자동화 cron 설계(계획)
