# GitHub 연동 및 자동 배포 설정 가이드

## 1. Git 저장소 초기화

프로젝트 디렉토리에서 다음 명령어를 실행하세요:

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 번째 커밋
git commit -m "Initial commit: AI Blog Post Generator"

# 기본 브랜치를 main으로 설정
git branch -M main
```

## 2. GitHub 저장소 생성

### 2.1 GitHub 웹사이트에서 생성
1. [GitHub.com](https://github.com) 접속 후 로그인
2. 우상단 **"+"** 버튼 → **"New repository"** 클릭
3. 저장소 설정:
   - **Repository name**: `ai-blog-generator` (또는 원하는 이름)
   - **Description**: `AI 블로그 포스트 생성기 - Google Gemini API 활용`
   - **Public** 또는 **Private** 선택
   - ✅ **Add a README file** 체크 해제 (이미 있음)
   - ✅ **.gitignore** 체크 해제 (이미 있음)
   - ✅ **Choose a license** 필요시 선택
4. **"Create repository"** 클릭

### 2.2 GitHub CLI로 생성 (선택사항)
```bash
# GitHub CLI 설치 후
gh repo create ai-blog-generator --public --source=. --remote=origin --push
```

## 3. 로컬 저장소와 GitHub 연결

GitHub에서 제공하는 명령어를 사용하거나 아래 명령어 실행:

```bash
# GitHub 저장소와 연결 (URL은 본인 저장소로 변경)
git remote add origin https://github.com/YOUR_USERNAME/ai-blog-generator.git

# 코드 푸시
git push -u origin main
```

**⚠️ 주의**: `YOUR_USERNAME`을 실제 GitHub 사용자명으로 변경하세요.

## 4. Vercel에서 GitHub 저장소 import

### 4.1 Vercel 계정 연결
1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. GitHub 계정으로 로그인 (권장)
3. GitHub 권한 허용

### 4.2 프로젝트 Import
1. **"New Project"** 버튼 클릭
2. **"Import Git Repository"** 섹션에서 GitHub 선택
3. 방금 생성한 `ai-blog-generator` 저장소 선택
4. **"Import"** 클릭

### 4.3 빌드 설정 확인
Vercel이 자동으로 감지하지만 확인해주세요:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 5. 환경 변수 설정

### 5.1 Vercel Dashboard에서 설정
1. 프로젝트 → **Settings** → **Environment Variables**
2. 새 환경 변수 추가:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `YOUR_GEMINI_API_KEY`
   - **Environments**: Production, Preview, Development 모두 체크
3. **Save** 클릭

### 5.2 API 키 확인 방법
Google AI Studio에서 API 키 발급:
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **"Create API Key"** 클릭
3. 생성된 키 복사하여 Vercel에 설정

## 6. 첫 번째 배포

환경 변수 설정 후:
1. Vercel Dashboard → **Deployments** 탭
2. **"Redeploy"** 클릭 (환경 변수 적용을 위해)
3. 배포 완료 대기 (보통 1-2분)

## 7. 자동 배포 확인

### 7.1 코드 수정 후 푸시 테스트
```bash
# 파일 수정 후
git add .
git commit -m "Update: 기능 개선"
git push origin main
```

### 7.2 배포 상태 확인
- Vercel Dashboard에서 자동으로 새 배포 시작
- GitHub 저장소에서 Deployments 탭에서도 확인 가능

## 8. 커스텀 도메인 설정 (선택사항)

### 8.1 도메인 추가
1. Vercel Dashboard → **Settings** → **Domains**
2. 도메인 입력 후 **Add**
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정

### 8.2 무료 도메인 옵션
- **Vercel 기본**: `your-project-name.vercel.app`
- **GitHub Pages**: `username.github.io/ai-blog-generator`

## 9. 브랜치 전략 (권장)

### 9.1 개발 브랜치 생성
```bash
# 개발용 브랜치 생성
git checkout -b develop
git push -u origin develop
```

### 9.2 Vercel 브랜치 설정
1. Vercel Dashboard → **Settings** → **Git**
2. **Production Branch**: `main`
3. **Preview Deployments**: 모든 브랜치 활성화

## 10. 문제 해결

### 10.1 빌드 실패 시
```bash
# 로컬에서 빌드 테스트
npm run build
npm run type-check
```

### 10.2 환경 변수 문제
- Vercel Dashboard에서 환경 변수 재확인
- 배포 후 다시 Redeploy 실행

### 10.3 Git 권한 문제
```bash
# HTTPS 대신 SSH 사용 (선택사항)
git remote set-url origin git@github.com:YOUR_USERNAME/ai-blog-generator.git
```

## 11. 배포 완료 확인

✅ **체크리스트**
- [ ] GitHub 저장소 생성 완료
- [ ] 코드 푸시 완료
- [ ] Vercel 프로젝트 import 완료
- [ ] 환경 변수 설정 완료
- [ ] 첫 배포 성공
- [ ] 앱 정상 작동 확인

**배포 URL**: `https://your-project-name.vercel.app`

---

## 🎉 완료!

이제 `main` 브랜치에 코드를 푸시할 때마다 자동으로 Vercel에 배포됩니다!

### 다음 단계
- 앱 테스트 및 피드백 수집
- 기능 개선 및 업데이트
- 성능 모니터링 (Vercel Analytics 활용)