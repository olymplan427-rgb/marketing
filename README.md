# AI Blog Generator

한국어 블로그 콘텐츠 생성 및 SNS 콘텐츠 제작을 지원하는 AI 기반 웹 애플리케이션입니다.

- SEO 최적화 블로그 포스트 자동 생성 (마크다운)
- AI 이미지 프롬프트/생성 (Midjourney 프롬프트, Google Imagen, Gemini)
- Instagram 콘텐츠 프레임 · 텍스트 풀 관리
- 콘텐츠 히스토리 관리 (Supabase)
- 사용자 인증 (Supabase Magic Link), 다크모드

> Threads 자동 포스팅은 개발 중단된 미완성 기능입니다. 자세한 내용은 [claude.md](./claude.md)의 "Threads (미완성)" 섹션을 참고하세요.

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite 6
- **Routing**: react-router-dom 7
- **AI**: 멀티 프로바이더 — Anthropic Claude / OpenAI GPT / Google Gemini (AI 설정 페이지에서 선택)
- **Backend**: Supabase (Auth, Database, Storage)
- **Deployment**: Vercel

## 로컬 실행

**사전 요구사항:** Node.js 18+

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 을 열어 Supabase 값 등을 입력

# 3. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 접속.

> **AI API 키**는 `.env`가 아니라 앱 UI(AI 설정 페이지)에서 입력합니다. 프로바이더별 키를 입력하면 로컬/Supabase에 저장됩니다.

## 개발 명령어

```bash
npm run dev          # 개발 서버 (포트 5173)
npm run type-check   # 타입 체크 (tsc --noEmit)
npm run build        # 프로덕션 빌드 (vite build)
npm run preview      # 빌드 결과 미리보기
```

## 배포

GitHub에 push하면 Vercel이 자동 배포합니다. 환경 변수는 Vercel 대시보드에서 설정합니다(자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md)).

## 문서

| 문서 | 내용 |
|------|------|
| [claude.md](./claude.md) | 프로젝트 전체 개요 · 아키텍처 · 워크플로우 (개발 시작점) |
| [DESIGN.md](./DESIGN.md) | UI 디자인 시스템 (모노크롬 Swiss-grid) |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel 배포 가이드 |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Supabase 설정 및 스키마 |
| [THREADS_API_SETUP.md](./THREADS_API_SETUP.md) | Threads API 설정 (미완성 기능) |
| [META_CALLBACK_URLS.md](./META_CALLBACK_URLS.md) | Meta 콜백 URL 설정 |
| [INSTAGRAM_CRON_SETUP.md](./INSTAGRAM_CRON_SETUP.md) | Instagram 자동화 cron 설계 (계획) |
