# Instagram Auto-Post Cron Job Setup Guide

## Overview

이 프로젝트는 매일 자동으로 Instagram 포스트 콘텐츠를 생성하는 Vercel Cron Job을 제공합니다.

## 일정

- **실행 시간**: 매일 오전 9시 (KST 기준은 `0 0 * * *` UTC = 오전 9시 KST)
- **경로**: `/api/cron/instagram-auto-post`

## 작동 방식

1. **텍스트 풀에서 랜덤 선택**: 사용되지 않은 질문 텍스트를 랜덤으로 가져옵니다
2. **AI 콘텐츠 생성**: Gemini AI로 질문, 캡션, 해시태그를 생성합니다 (memory-drawer 프롬프트 사용)
3. **배경 이미지 선택**: Supabase Storage에서 랜덤 배경 이미지를 선택합니다
4. **데이터베이스 저장**: 생성된 콘텐츠를 `instagram_posts` 테이블에 저장합니다
5. **텍스트 사용 표시**: 사용된 텍스트를 `is_used = true`로 마킹합니다

## 필수 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 설정해야 합니다:

### 1. Vercel Cron 인증

```bash
CRON_SECRET=your-random-secret-string
```

생성 방법:
```bash
openssl rand -base64 32
```

### 2. Supabase 설정

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Gemini API 키

```bash
GEMINI_API_KEY=your-gemini-api-key
# 또는
VITE_GEMINI_API_KEY=your-gemini-api-key
```

발급: https://aistudio.google.com/app/apikey

### 4. 사용자 ID (선택)

```bash
AUTO_POST_USER_ID=browser_default
```

기본값: `browser_default` (브라우저에서 사용하는 기본 user_id)

## Vercel 설정 방법

### 1. Vercel 대시보드에서 환경 변수 추가

1. Vercel 프로젝트 대시보드 접속
2. Settings → Environment Variables 메뉴
3. 위의 환경 변수들을 추가
4. Production, Preview, Development 모두 체크

### 2. vercel.json 확인

```json
{
  "crons": [
    {
      "path": "/api/cron/instagram-auto-post",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- `schedule`: Cron 표현식 (UTC 기준)
  - `0 9 * * *` = 매일 UTC 09:00 = KST 18:00
  - `0 0 * * *` = 매일 UTC 00:00 = KST 09:00

### 3. 배포

```bash
git add .
git commit -m "Add Instagram auto-post cron job"
git push
```

Vercel이 자동으로 배포하고 Cron Job을 활성화합니다.

## 테스트

### 로컬 테스트

```bash
curl -X POST http://localhost:3000/api/cron/instagram-auto-post \
  -H "Authorization: Bearer your-cron-secret"
```

### 프로덕션 테스트

```bash
curl -X POST https://your-domain.vercel.app/api/cron/instagram-auto-post \
  -H "Authorization: Bearer your-cron-secret"
```

## 로그 확인

Vercel 대시보드에서 로그 확인:

1. Vercel 프로젝트 대시보드
2. Deployments → 최신 배포 선택
3. Functions → `/api/cron/instagram-auto-post` 선택
4. Logs 확인

## 주의사항

### 이미지 생성 제한

현재 버전에서는 **최종 합성 이미지(배경 + 텍스트 오버레이)는 생성되지 않습니다**.

이유:
- 서버 사이드 이미지 렌더링은 추가 인프라(Puppeteer/node-canvas) 필요
- 현재 구현은 브라우저의 html-to-image 사용
- Vercel Serverless Function의 메모리/시간 제한

**해결 방법:**
1. 포스트는 `scheduled` 상태로 저장됨
2. 프론트엔드에서 수동으로 이미지 생성 후 발행
3. 또는 별도의 이미지 생성 서비스 추가 (향후 구현)

### Quota 관리

- **Gemini API**: 무료 티어는 일일 요청 제한이 있습니다
- **Supabase**: 무료 티어는 용량/대역폭 제한이 있습니다
- **텍스트 풀**: 텍스트가 모두 사용되면 새 텍스트를 추가해야 합니다

## 향후 개선 사항

- [ ] 서버 사이드 이미지 생성 (Puppeteer 또는 node-canvas)
- [ ] Instagram Graph API 연동 (자동 발행)
- [ ] 텍스트 풀 자동 리필 (AI 생성)
- [ ] 스케줄 커스터마이징 (시간대, 빈도 등)
- [ ] 실패 시 재시도 로직
- [ ] 슬랙/이메일 알림

## 트러블슈팅

### 401 Unauthorized

→ `CRON_SECRET` 환경 변수 확인

### No unused texts available

→ 텍스트 풀에 새 텍스트 추가 필요 (`인스타그램 > 텍스트 풀 관리`)

### Gemini API key not configured

→ `GEMINI_API_KEY` 또는 `VITE_GEMINI_API_KEY` 환경 변수 설정

### Supabase not configured

→ `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 환경 변수 설정

## 관련 파일

- `/api/cron/instagram-auto-post.ts` - Cron Job 핸들러
- `/vercel.json` - Vercel 설정
- `/services/geminiService.ts` - AI 콘텐츠 생성
- `/services/instagramTextPoolService.ts` - 텍스트 풀 관리
- `/services/instagramService.ts` - Instagram 포스트 CRUD

## 문의

이슈 또는 질문이 있으면 GitHub Issues에 등록해주세요.
