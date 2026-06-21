# Threads API 설정 가이드

이 가이드는 Meta for Developers에서 Threads 앱을 설정하고 프로젝트에 통합하는 방법을 안내합니다.

## 📋 목차

1. [Meta for Developers 앱 생성](#1-meta-for-developers-앱-생성)
2. [Threads API 권한 설정](#2-threads-api-권한-설정)
3. [OAuth 리다이렉트 URI 설정](#3-oauth-리다이렉트-uri-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [로컬 개발 테스트](#5-로컬-개발-테스트)
6. [프로덕션 배포](#6-프로덕션-배포)
7. [문제 해결](#7-문제-해결)

---

## 1. Meta for Developers 앱 생성

### 1.1 Meta for Developers 사이트 접속

1. [Meta for Developers](https://developers.facebook.com/) 접속
2. 우측 상단 "내 앱" 클릭
3. "앱 만들기" 버튼 클릭

### 1.2 앱 타입 선택

1. **비즈니스**나 **소비자** 타입 선택
2. 앱 이름 입력 (예: "AI Blog Generator Threads Integration")
3. 앱 연락처 이메일 입력
4. "앱 만들기" 클릭

### 1.3 앱 ID와 시크릿 확인

앱 생성 후:
1. 좌측 메뉴에서 **설정 > 기본 설정** 클릭
2. **앱 ID** 복사 (예: `<your_threads_app_id>`)
3. **앱 시크릿** 표시 후 복사 (예: `<your_threads_app_secret>`)

⚠️ **중요**: 앱 시크릿은 절대 공개 저장소에 커밋하지 마세요!

---

## 2. Threads API 권한 설정

### 2.1 Threads 제품 추가

1. 좌측 메뉴에서 **제품 추가** 클릭
2. **Threads** 찾아서 "설정" 클릭

### 2.2 필요한 권한

다음 권한이 활성화되어 있는지 확인:

- ✅ `threads_basic` - 기본 프로필 정보 접근
- ✅ `threads_content_publish` - 포스트 생성 및 발행
- 🔘 `threads_manage_insights` - 인사이트 조회 (선택사항)

---

## 3. OAuth 리다이렉트 URI 설정

### 3.1 개발 환경 URI 설정

1. **Threads > 설정** 메뉴로 이동
2. **OAuth 리디렉션 URI** 섹션 찾기
3. 다음 URI 추가:

   ```
   http://localhost:5173/auth/threads/callback
   ```

4. "변경사항 저장" 클릭

### 3.2 프로덕션 URI 설정 (Vercel 배포 시)

프로덕션 환경에서 사용할 URI도 추가:

```
https://your-app-domain.vercel.app/auth/threads/callback
```

예시:
```
https://ai-blog-generator.vercel.app/auth/threads/callback
```

---

## 4. 환경 변수 설정

### 4.1 로컬 개발 환경

프로젝트 루트의 `.env` 파일에 다음 내용 추가:

```bash
# Threads API Configuration
VITE_THREADS_APP_ID=<your_threads_app_id>
VITE_THREADS_APP_SECRET=<your_threads_app_secret>
VITE_THREADS_REDIRECT_URI=http://localhost:5173/auth/threads/callback
```

⚠️ **주의**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

### 4.2 프로덕션 환경 (Vercel)

Vercel 대시보드에서 환경 변수 설정:

1. Vercel 프로젝트 선택
2. **Settings > Environment Variables** 이동
3. 다음 변수 추가:

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `VITE_THREADS_APP_ID` | `<your_threads_app_id>` | Production, Preview, Development |
   | `VITE_THREADS_APP_SECRET` | `<your_threads_app_secret>` | Production, Preview, Development |
   | `VITE_THREADS_REDIRECT_URI` | `https://your-domain.vercel.app/auth/threads/callback` | Production |

4. "Save" 클릭
5. 재배포 (Redeploy)

---

## 5. 로컬 개발 테스트

### 5.1 개발 서버 실행

```bash
npm run dev
```

### 5.2 Threads 인증 테스트

1. 브라우저에서 `http://localhost:5173` 접속
2. 좌측 메뉴에서 **"쓰레드 포스트"** 클릭
3. **"Threads 계정 연동하기"** 버튼 클릭
4. Threads 로그인 페이지로 리다이렉트
5. 권한 승인
6. 앱으로 다시 리다이렉트되어 인증 완료

### 5.3 포스트 발행 테스트

1. "콘텐츠 소재 선택"에서 주제 입력
2. "AI 콘텐츠 소재 생성" 클릭
3. 생성된 소재에서 "초안 생성" 클릭
4. 초안 확인 후 "발행" 버튼 클릭
5. Threads에 포스트가 자동으로 발행됨

---

## 6. 프로덕션 배포

### 6.1 Meta 앱 모드 변경

개발이 완료되면 앱을 **라이브 모드**로 전환:

1. Meta for Developers 대시보드
2. **설정 > 기본 설정**
3. **앱 모드** 스위치를 "라이브"로 전환
4. 필요한 정보 입력 (개인정보 처리방침 URL, 이용약관 등)
5. "검토 제출" (필요시)

### 6.2 도메인 검증

Meta에서 도메인 검증 요구 시:

1. **설정 > 기본 설정 > 앱 도메인** 섹션
2. Vercel 도메인 추가 (예: `your-app.vercel.app`)
3. DNS 또는 HTML 파일로 도메인 소유권 확인

---

## 7. 문제 해결

### 7.1 "Invalid OAuth Redirect URI" 오류

**원인**: Meta 대시보드에 리다이렉트 URI가 등록되지 않음

**해결**:
1. Meta for Developers > Threads > 설정
2. OAuth 리다이렉션 URI 확인
3. 정확히 일치하는 URI 추가 (프로토콜, 포트 번호 포함)

### 7.2 "Access Token Invalid" 오류

**원인**: 토큰이 만료되었거나 앱 시크릿이 변경됨

**해결**:
1. 브라우저에서 "연동 해제" 클릭
2. 다시 "Threads 계정 연동하기" 클릭
3. 재인증

### 7.3 "App Not Setup" 오류

**원인**: 앱이 개발 모드이고 테스트 사용자가 아님

**해결**:
1. Meta for Developers > **역할 > 테스트 사용자**
2. 테스트할 Threads 계정 추가
3. 또는 앱을 라이브 모드로 전환

### 7.4 CORS 오류

**원인**: Meta API가 프론트엔드에서 직접 호출되는 경우

**참고**: 현재 구현은 클라이언트 사이드에서 Threads API를 호출합니다. 프로덕션에서는 백엔드 프록시를 사용하는 것이 권장됩니다.

### 7.5 환경 변수가 로드되지 않음

**원인**: Vite 환경 변수는 `VITE_` 접두사 필요

**확인사항**:
- 변수 이름이 `VITE_`로 시작하는지 확인
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 개발 서버 재시작 (`npm run dev`)

---

## 📚 추가 리소스

- [Threads API 공식 문서](https://developers.facebook.com/docs/threads)
- [Meta OAuth 가이드](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/)
- [Vite 환경 변수 가이드](https://vitejs.dev/guide/env-and-mode.html)

---

## 🔐 보안 주의사항

1. **절대 커밋하지 마세요**:
   - `.env` 파일
   - 앱 시크릿
   - 액세스 토큰

2. **프로덕션에서는**:
   - HTTPS 사용 필수
   - 백엔드 프록시로 API 호출 권장
   - 환경 변수를 Vercel/서버에서만 관리

3. **토큰 관리**:
   - 액세스 토큰은 localStorage에 저장됨
   - 주기적으로 토큰 갱신 구현 권장
   - 토큰 만료 처리 로직 확인

---

## ✅ 체크리스트

설정 완료 전 확인:

- [ ] Meta for Developers에 앱 생성
- [ ] 앱 ID와 시크릿 확인
- [ ] Threads API 권한 설정
- [ ] OAuth 리다이렉트 URI 등록
- [ ] `.env` 파일에 환경 변수 설정
- [ ] 로컬에서 인증 테스트
- [ ] 로컬에서 포스팅 테스트
- [ ] Vercel 환경 변수 설정
- [ ] 프로덕션 배포 및 테스트
- [ ] Meta 앱 라이브 모드 전환 (선택)

---

**완료!** 이제 Threads API가 프로젝트에 통합되었습니다. 🎉
