# 배포 가이드 (Deployment Guide)

## Vercel 배포 설정

### 1. 환경 변수 설정

Vercel Dashboard → Your Project → Settings → Environment Variables에서 다음 환경 변수를 추가하세요:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**중요:** 모든 환경에 적용되도록 "Production", "Preview", "Development" 모두 체크하세요.

### 2. Supabase Dashboard 설정

#### Authentication → URL Configuration

1. **Site URL**: `https://your-app.vercel.app` (배포 후 URL로 변경)
2. **Redirect URLs**: `https://your-app.vercel.app/**`

#### Authentication → Providers
- **Email Provider**: 활성화
- **Confirm email**: 필요에 따라 설정

### 3. 배포 명령어

```bash
vercel --prod
```

## 로컬 개발 환경

`.env.local` 파일에 환경 변수 설정 (이미 설정됨)

```bash
npm run dev
```
