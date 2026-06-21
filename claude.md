# AI Blog Generator - Claude.md

## 프로젝트 개요

한국어 블로그 콘텐츠 생성 및 SNS 자동 포스팅을 지원하는 AI 기반 웹 애플리케이션입니다.

### 주요 기능
- SEO 최적화된 블로그 포스트 자동 생성
- AI 이미지 프롬프트 생성 (Midjourney, Google Imagen)
- Threads 자동 포스팅(포스팅 컨텐츠 생성 완료, 자동 포스팅은 개발 전)
- Instagram 콘텐츠 프레임 생성
- 콘텐츠 히스토리 관리
- 사용자 인증 (Supabase Magic Link)
- 다크모드 지원

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Google Gemini API (2.5 Pro with Flash fallback)
- **Backend**: Supabase (Auth, Database)
- **Deployment**: Vercel
- **Styling**: CSS (다크모드 지원)

## 프로젝트 구조

```
/
├── components/          # React 컴포넌트
│   ├── MainBlogAssistant.tsx      # 메인 블로그 생성 UI
│   ├── AISettingsPage.tsx          # AI 모델 설정
│   ├── PromptSettingsPage.tsx      # 프롬프트 커스터마이징
│   ├── SNSManagement.tsx           # SNS 계정 관리
│   ├── ThreadsAutoPosting.tsx      # Threads 자동 포스팅
│   ├── InstaContentFrame.tsx       # Instagram 콘텐츠
│   ├── ContentHistoryPage.tsx      # 콘텐츠 히스토리
│   ├── AuthPage.tsx                # 로그인/회원가입
│   ├── Header.tsx                  # 헤더 컴포넌트
│   ├── Sidebar.tsx                 # 사이드바 네비게이션
│   └── ...
├── services/           # 비즈니스 로직 및 API 서비스
│   ├── geminiService.ts           # Gemini API 통합
│   ├── authService.ts             # Supabase 인증
│   ├── settingsService.ts         # 설정 관리
│   └── historyService.ts          # 히스토리 CRUD
├── lib/                # 라이브러리 및 유틸리티
│   └── supabase.ts                # Supabase 클라이언트
├── App.tsx             # 메인 앱 컴포넌트
├── types.ts            # TypeScript 타입 정의
└── supabase-schema.sql # 데이터베이스 스키마

```

## 핵심 워크플로우

### 1. 블로그 포스트 생성
1. 지역/카테고리 입력 → SEO 주제 생성
2. 주제 선택 → 키워드/타겟독자/인사이트 제안
3. 참고자료 추가 (URL, 파일 업로드)
4. 블로그 포스트 생성 (마크다운 형식)
5. 이미지 생성 (Midjourney/Imagen)

### 2. AI 이미지 생성
- **Midjourney**: 프롬프트 생성 (매개변수 포함: --ar, --style, --v)
- **Imagen**: Google Imagen API를 통한 직접 이미지 생성

### 3. Threads 자동 포스팅
- Meta Threads API 완전 통합
- OAuth 인증 플로우
- 칸반보드 방식의 포스트 관리 (작성중/검토중/발행완료)
- 실시간 Threads 포스트 발행
- 포스트 히스토리 저장/복원

### 4. 콘텐츠 히스토리
- Supabase에 저장된 생성 콘텐츠 관리
- 저장/복원/삭제 기능
- 블로그 포스트 및 이미지 프롬프트 저장

## 환경 변수

```bash
# AI API
VITE_GEMINI_API_KEY=your_gemini_api_key

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Threads API
VITE_THREADS_APP_ID=your_threads_app_id
VITE_THREADS_APP_SECRET=your_threads_app_secret
VITE_THREADS_REDIRECT_URI=http://localhost:5173/auth/threads/callback
```

## 개발 시 주의사항

### AI 모델 관리
- **Gemini Pro**: 고품질 콘텐츠 생성, 쿼터 제한 있음
- **Gemini Flash**: Pro 쿼터 초과 시 자동 폴백
- 3단계 폴백 시스템: Pro → Flash → 에러 처리

### Supabase 설정
- 인증: Magic Link 이메일 기반
- 스키마: `supabase-schema.sql` 참고
- RLS (Row Level Security) 정책 적용

### 이미지 생성
- Midjourney: 프롬프트만 생성 (외부 플랫폼 사용)
- Imagen: API 직접 호출 (`imagen-4.0-generate-001` 모델)
- 재시도 로직: 지수 백오프로 rate limiting 처리

### 스타일링
- CSS 변수를 활용한 다크모드
- `data-theme="dark"` 속성으로 테마 전환

## 배포

### Vercel 배포
```bash
npm run build
# Vercel에 자동 배포 (vercel.json 설정)
```

### 빌드 설정
- `vite.config.ts`: Vercel 최적화 설정
- `vercel.json`: 라우팅 및 환경 설정

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 타입 체크
npm run type-check

# 프로덕션 빌드
npm run build

# 프리뷰
npm run preview
```

## 주요 타입 정의

```typescript
// types.ts 참고
- BlogGenerationParams: 블로그 생성 매개변수
- PromptTemplates: 프롬프트 템플릿 설정
- GeneratedImage: 생성된 이미지 정보
- BlogPostResult: 블로그 포스트 결과
- ContentHistory: Supabase 히스토리 레코드
```

## 코드 수정 시 가이드라인

1. **컴포넌트**: 각 기능별로 분리된 컴포넌트 유지
2. **서비스**: API 호출 및 비즈니스 로직은 services/ 디렉토리에 집중
3. **타입**: types.ts에 모든 공유 타입 정의
4. **에러 처리**: AI API 호출 시 쿼터/rate limit 고려
5. **보안**: API 키는 반드시 환경 변수 사용

## 알려진 이슈 및 제한사항

- Gemini Pro API 쿼터 제한으로 인한 Flash 폴백 필요
- Imagen API rate limiting (재시도 로직으로 처리)
- Threads API는 클라이언트 사이드 구현 (프로덕션에서는 백엔드 프록시 권장)

## 참고 문서

- [THREADS_API_SETUP.md](./THREADS_API_SETUP.md): Threads API 설정 가이드
- [DEPLOYMENT.md](./DEPLOYMENT.md): 배포 가이드
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md): Supabase 설정
- [GITHUB_SETUP.md](./GITHUB_SETUP.md): GitHub 설정
- [README.md](./README.md): 프로젝트 소개
