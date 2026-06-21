# AI 호출 서버리스 프록시화 — 설계 문서

작성일: 2026-06-21

## 목적
모든 AI 호출(Gemini/OpenAI/Anthropic, 텍스트+이미지)을 Vercel 서버리스 함수로 경유시키고, API 키를 **`VITE_` 아닌 서버 env**로 관리한다. 키가 브라우저 번들에 절대 노출되지 않게 한다. (기존: 사용자가 UI에서 키 입력 → localStorage 저장 → 브라우저에서 직접 SDK 호출)

## 방식: 투명 프록시 (key-injecting reverse proxy)
서비스 로직을 서버로 재구현하지 않고(거대·고위험), SDK의 `baseURL`/`httpOptions.baseUrl`만 같은 출처의 프록시로 돌린다. 프록시는 **인증 검증 + 실제 키 주입 + 그대로 전달**만 한다.

```
브라우저 SDK (baseURL=/api/proxy/<provider>, key='proxy', x-app-token=<supabase token>)
   → /api/proxy/<provider>/[...path]  (Vercel 서버리스)
        - x-app-token 검증 (Supabase /auth/v1/user 200)
        - provider 실제 키 주입 (process.env.*_API_KEY)
        - 원본 API로 fetch 후 응답 그대로 반환
   → api.anthropic.com / api.openai.com / generativelanguage.googleapis.com
```

## 구성요소

### 신규
- `services/aiAuth.ts` — Supabase access token 저장소(`setAiAuthToken`/`getAiAuthToken`), 동일출처 `proxyBase()`, Anthropic/OpenAI용 커스텀 `proxyFetch`(x-app-token 주입).
- `api/_lib/proxy.ts` — `forward()`: 토큰 검증 → 헤더 정리 → 키 주입 → 전달. 401/502 처리.
- `api/proxy/anthropic/[...path].ts` / `openai/[...path].ts` / `gemini/[...path].ts` — 각 provider 라우트(`maxDuration: 60`).

### 변경
- `services/anthropicService.ts` / `openaiService.ts`: 클라이언트를 `baseURL=프록시` + `fetch=proxyFetch` + `apiKey:'proxy'`로 생성. `setApiKey`는 no-op. (Anthropic/OpenAI SDK는 커스텀 fetch 지원 → 토큰 라이브 주입)
- `services/geminiService.ts`: `httpOptions.baseUrl=프록시` + 정적 `x-app-token` 헤더. @google/genai는 커스텀 fetch 미지원이라 토큰 변경 시 클라이언트 재생성.
- `hooks/useAuth.ts`: 로그인/토큰갱신 시 `setAiAuthToken(session.access_token)` 동기화.
- `components/AISettingsPage.tsx`: API 키 입력란/상태 제거 → "키는 서버에서 관리됨" 안내. provider·모델 선택만 유지.

### 환경변수 (Vercel, VITE_ 금지)
`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`. 토큰 검증엔 기존 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`(서버에서도 process.env로 읽힘) 사용.

## URL 매핑
- Anthropic: client `baseURL=/api/proxy/anthropic` → `…/v1/messages` → `api.anthropic.com/v1/messages`
- OpenAI: client `baseURL=/api/proxy/openai/v1` → `…/v1/chat/completions` → `api.openai.com/v1/chat/completions`
- Gemini: `baseUrl=/api/proxy/gemini` → `…/v1beta/models/…:generateContent` → `generativelanguage.googleapis.com/…`

## 보안/남용 방지
- 모든 프록시 요청은 Supabase 로그인 토큰(`x-app-token`) 필수. 미로그인 → 401.
- 키는 서버 env에만 존재. 번들·네트워크 응답 어디에도 노출 안 됨.

## 비스트리밍 / 제약
- 현재 모든 AI 호출은 비스트리밍(generateContent/messages.create). SSE 프록시 불필요.
- 긴 블로그 생성 대비 `maxDuration: 60`.
- 토큰 검증으로 호출당 ~100ms 추가(허용 범위). 필요 시 캐시 도입 가능.

## 검증
- `npm run build` 통과, 내 파일 type-check clean.
- 번들에 `/api/proxy/*` 포함 + 키 문자열 0건 확인.
- 배포 후: Vercel env 등록 → 로그인 상태에서 Gemini/Claude 생성·이미지 생성 동작 확인.
