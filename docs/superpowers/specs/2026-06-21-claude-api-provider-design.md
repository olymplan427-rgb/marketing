# Claude(Anthropic) API 프로바이더 추가 — 설계 문서

작성일: 2026-06-21

## 배경 / 목적
기존 블로그 생성기는 Gemini·OpenAI 프로바이더를 지원한다. Claude(Anthropic) API 환경에서도 콘텐츠를 생성할 수 있도록 프로바이더를 추가한다.

멀티 프로바이더 골격(`AIProvider` 타입, 설정 UI, localStorage/Supabase 저장, provider별 `apiKeys`/`selectedSubModels`)은 이미 `'anthropic'`을 포함한다. 빠진 것은 실제 호출 서비스(`anthropicService.ts`)와 분기 연결, SDK 의존성뿐이다.

## 결정사항
- 모델: 최신 3개 — `claude-opus-4-8`, `claude-sonnet-4-6`(기본), `claude-haiku-4-5`
- 기본 활성 프로바이더: `anthropic` (신규 사용자 기준)
- 이미지 **생성**은 Claude 불가 → 항상 Gemini(Nano Banana). 텍스트 생성(블로그/주제/필드/이미지 프롬프트)만 Claude 담당.

## 변경 범위 (5개 파일 + 1 의존성)

### 1. 의존성
`@anthropic-ai/sdk` 추가.

### 2. 신규 `services/anthropicService.ts`
`openaiService.ts`와 동일한 export 인터페이스:
- `setApiKey(key)` / `setModel(model)` — `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`
- `generateSeoTopics(prompt): Promise<string[]>`
- `generateFieldSuggestions(prompt): Promise<FieldSuggestions>`
- `generateBlogPost(prompt, useSearch?): Promise<BlogPostResult>`
- `generateImagePrompt(koreanPrompt, customPromptTemplate?): Promise<string>`

Claude 특화:
- `temperature` **미전송** (Opus 4.8/Sonnet 4.6는 sampling 파라미터 400)
- `thinking` 미사용 (생성 작업, 지연 최소화)
- JSON 응답은 텍스트로 받아 마크다운 펜스(```json) 제거 후 `JSON.parse`
- `max_tokens`: 블로그 16000 / 주제·필드·이미지프롬프트 2048 (비스트리밍, 타임아웃 안전 범위)
- rate limit(429) 지수 백오프 재시도, 한국어 친화 에러 메시지
- 웹 검색 미사용 → `sources: []` (OpenAI와 동일; 추후 `web_search` 도구 확장 가능)
- 기본 모델 `claude-sonnet-4-6`. UI 모델 값 = 실제 API ID이므로 매핑 불필요(검증/패스스루).

### 3. `hooks/useBlogGeneration.ts`
4곳의 `activeProvider === 'openai' ? openai : gemini` 분기에 anthropic 추가. 실수 방지를 위해 상단에 provider→함수 매핑 헬퍼로 정리(텍스트 4종: topics, fieldSuggestions, blogPost, imagePrompt). 이미지 생성(`handleGenerateImage`)은 Gemini 고정이라 변경 없음.

### 4. `hooks/useAISettings.ts`
- API 키 동기화 effect에 `anthropic` 분기(`setAnthropicApiKey`)
- 모델 동기화 effect에 `anthropic` 분기(`setAnthropicModel`)
- 기본 `activeProvider` `'gemini'`→`'anthropic'`, 기본 `selectedSubModels.anthropic` `'claude-sonnet-4-6'`
- 기존 localStorage 사용자는 영향 없음(신규만)

### 5. `components/AISettingsPage.tsx`
`SUB_MODEL_CONFIG.anthropic`의 구버전 ID(claude-3.5-sonnet 등)를 최신 3개로 교체.

## 데이터 흐름
AI 설정에서 Claude 선택 + 키 입력 → 저장(기존) → `useAISettings`가 `anthropicService.setApiKey/setModel` 호출 → 생성 시 `useBlogGeneration`이 activeProvider로 분기 → 이미지 생성 단계만 `geminiService`.

## 의존성 / 제약
- Claude 사용 시에도 이미지 생성에 Gemini 키 필요. `geminiService.getAiInstance()`가 localStorage에서 지연 로드하므로, 사용자가 Gemini 키만 입력해두면 동작. 추가 배선 불필요.
- API 키 브라우저 노출은 기존 OpenAI/Gemini와 동일 아키텍처. 백엔드 프록시는 본 작업 범위 밖.

## 검증
- `npm run type-check`, `npm run build` 통과
- Claude 키로 주제→필드→블로그→이미지 프롬프트 생성 + 이미지 생성(Gemini) 수동 확인
