# Meta for Developers - 콜백 URL 설정

## 🔗 Meta 대시보드에 입력할 URL 목록

Vercel 배포 URL: **https://blogpost-plum-two.vercel.app**

---

## 1️⃣ OAuth 리디렉션 URI (OAuth Redirect URIs)

**위치:** Meta for Developers > Threads > 설정 > OAuth 리디렉션 URI

**입력할 URL (2개):**

### 프로덕션 (Vercel)
```
https://blogpost-plum-two.vercel.app/auth/threads/callback
```

### 로컬 개발 (선택사항)
```
http://localhost:5173/auth/threads/callback
```

⚠️ **주의:** Meta는 각 URL을 개별적으로 추가해야 합니다. "추가" 버튼을 클릭하여 두 URL을 모두 등록하세요.

---

## 2️⃣ 데이터 삭제 요청 URL (Data Deletion Request URL)

**위치:** Meta for Developers > 설정 > 기본 설정 > 데이터 삭제 요청 URL

**입력할 URL:**
```
https://blogpost-plum-two.vercel.app/api/threads/deletion
```

---

## 3️⃣ 앱 권한 제거 콜백 URL (Deauthorize Callback URL)

**위치:** Meta for Developers > 설정 > 기본 설정 > 앱 권한 제거 콜백 URL

**입력할 URL:**
```
https://blogpost-plum-two.vercel.app/api/threads/deauthorize
```

---

## 4️⃣ 앱 도메인 (App Domains)

**위치:** Meta for Developers > 설정 > 기본 설정 > 앱 도메인

**입력할 도메인:**
```
blogpost-plum-two.vercel.app
```

⚠️ **주의:** `https://` 또는 `/` 없이 도메인만 입력하세요.

---

## ✅ 설정 체크리스트

- [ ] OAuth 리디렉션 URI - 프로덕션 추가
- [ ] OAuth 리디렉션 URI - 로컬 개발 추가 (선택)
- [ ] 데이터 삭제 요청 URL 설정
- [ ] 앱 권한 제거 콜백 URL 설정
- [ ] 앱 도메인 추가
- [ ] 변경사항 저장

---

## 🔄 Vercel 환경 변수 설정

Meta 대시보드 설정 후, Vercel에도 환경 변수를 설정해야 합니다.

### Vercel 대시보드에서 설정

1. https://vercel.com/dashboard 접속
2. `blogpost-plum-two` 프로젝트 선택
3. **Settings** > **Environment Variables** 이동
4. 다음 변수 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_THREADS_APP_ID` | `818751050751038` | Production, Preview, Development |
| `VITE_THREADS_APP_SECRET` | `7c69152f15efd00f0a4da3e074e6b1da` | Production, Preview, Development |
| `VITE_THREADS_REDIRECT_URI` | `https://blogpost-plum-two.vercel.app/auth/threads/callback` | Production |
| `VITE_THREADS_REDIRECT_URI` | `http://localhost:5173/auth/threads/callback` | Development |

5. **Save** 클릭
6. **Deployments** 탭으로 이동
7. 최신 배포에서 **⋯** > **Redeploy** 클릭

---

## 🧪 테스트 방법

### 1. 프로덕션에서 테스트

1. https://blogpost-plum-two.vercel.app 접속
2. 좌측 메뉴 **"쓰레드 포스트"** 클릭
3. **"Threads 계정 연동하기"** 버튼 클릭
4. Threads 로그인 및 권한 승인
5. 콜백 페이지로 리다이렉트 확인
6. 인증 완료 메시지 확인

### 2. 콜백 엔드포인트 확인

각 엔드포인트가 정상 작동하는지 확인:

```bash
# 데이터 삭제 엔드포인트 테스트
curl https://blogpost-plum-two.vercel.app/api/threads/deletion

# 권한 제거 엔드포인트 테스트
curl https://blogpost-plum-two.vercel.app/api/threads/deauthorize
```

정상 응답:
```json
{
  "message": "Data deletion endpoint is active",
  "status": "ok"
}
```

---

## 🐛 문제 해결

### "Invalid OAuth Redirect URI" 오류

**원인:** Meta 대시보드에 URL이 정확히 등록되지 않음

**해결:**
1. URL 끝에 `/` 없이 정확히 입력했는지 확인
2. `https://` 프로토콜 포함 확인
3. 대소문자 정확히 일치하는지 확인

### "URL must use HTTPS" 오류

**원인:** HTTP URL 사용

**해결:**
- 로컬 개발용 URL만 `http://localhost` 허용
- 다른 모든 URL은 `https://` 필수

### Vercel 환경 변수가 적용 안 됨

**원인:** 환경 변수 변경 후 재배포 안 함

**해결:**
1. Vercel 대시보드 > Deployments
2. 최신 배포 > Redeploy 클릭
3. 약 1-2분 대기

---

## 📞 추가 도움

문제가 지속되면:
1. Meta for Developers 대시보드 스크린샷 확인
2. Vercel 배포 로그 확인
3. 브라우저 콘솔 에러 확인

---

**업데이트 날짜:** 2025-01-XX
**Vercel 배포 URL:** https://blogpost-plum-two.vercel.app
