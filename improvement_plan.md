<!-- bfdd3091-de8f-484c-b6e5-1a7362fd2e03 e07daa6b-aa4e-4f2e-ad80-42455bc04bda -->
# 코드베이스 개선 실행 계획

## 1. 보안 개선: API 키 클라이언트 노출 방지

### 현재 문제점

- `VITE_GEMINI_API_KEY` 환경변수가 빌드 시 번들에 포함되어 노출됨
- API 키가 localStorage에 평문으로 저장됨
- 다른 브라우저/기기에서 접근 시 매번 API 키 재입력 필요
- `services/geminiService.ts:48`에서 `import.meta.env.VITE_GEMINI_API_KEY` 직접 사용

### 개선 방안: Option B' (Supabase 저장 + 암호화)

현재 프로젝트에서 Threads 토큰을 Supabase에 저장하는 패턴을 이미 사용 중이므로, 동일한 방식으로 API 키도 관리합니다.

**장점:**
- ✅ 다중 기기 동기화 (한 번 설정하면 모든 브라우저에서 사용)
- ✅ Threads 토큰과 동일한 검증된 패턴 재사용
- ✅ 사용자별 관리 (각자 자신의 API 키 사용, 할당량 공유 문제 없음)
- ✅ 클라이언트 암호화 + Supabase RLS로 적절한 보안 수준
- ✅ 비용 제어 용이 (사용자가 자기 키로 사용)

**구현 방법:**
```typescript
// 1. Supabase에 암호화된 API 키 저장
interface EncryptedAPIKeys {
  gemini?: string;  // 암호화된 키
  openai?: string;
  anthropic?: string;
}

// 2. 사용자별로 저장 (Supabase Auth 활용)
const saveAPIKey = async (provider: string, apiKey: string) => {
  const encrypted = encrypt(apiKey); // crypto-js로 AES 암호화

  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      encrypted_api_keys: {
        ...existingKeys,
        [provider]: encrypted
      }
    });
};

// 3. 로그인 시 자동으로 불러오기
useEffect(() => {
  if (user) {
    const keys = await loadAPIKeysFromSupabase(user.id);
    setApiKey(decrypt(keys.gemini));
  }
}, [user]);
```

### 구현 단계

1. **Supabase 마이그레이션** (30분)
   - `user_settings` 테이블에 `encrypted_api_keys JSONB` 컬럼 추가
   - RLS 정책 확인 (user_id 기반)
   - 마이그레이션 SQL 파일 작성: `supabase-migration-api-keys.sql`

2. **암호화 유틸리티 추가** (30분)
   - `npm install crypto-js`
   - `lib/encryption.ts` 생성
   - AES 암호화/복호화 함수 구현
   - 암호화 키는 사용자 ID 기반으로 생성

3. **settingsService.ts 수정** (1시간)
   - `saveAPIKeys` → Supabase 저장으로 변경
   - `loadAPIKeys` → Supabase 로드로 변경
   - localStorage 마이그레이션 로직 (기존 키를 Supabase로 이전)
   - 오프라인 시 localStorage 폴백 로직

4. **geminiService.ts 수정** (30분)
   - `VITE_GEMINI_API_KEY` 환경변수 제거 (48번째 줄)
   - Supabase에서 로드한 키 사용으로 변경
   - API 키 없을 시 사용자에게 설정 안내

5. **UI 개선** (30분)
   - AI 설정 페이지에 "모든 기기에서 동기화됨" 안내 추가
   - 첫 방문 시 API 키 설정 유도 모달

6. **테스트 및 검증** (30분)
   - 다른 브라우저에서 로그인 후 자동 동기화 확인
   - 암호화/복호화 정상 작동 확인
   - localStorage 마이그레이션 테스트

**예상 작업 시간: 3-4시간**

---

## 2. 구조 개선: App.tsx 분리 및 Context API 도입

### 현재 상태

- App.tsx: 약 928줄 (권장 300-400줄 초과)
- 48개의 hook 호출로 복잡한 상태 관리
- 라우팅, 상태 관리, 비즈니스 로직이 모두 한 파일에 집중
- props drilling 발생 가능성

### 분리 계획

#### 2.1 Context API 도입

**파일 생성:**
- `contexts/AuthContext.tsx` - 인증 상태 전역 관리
- `contexts/AISettingsContext.tsx` - AI 설정 전역 관리 (apiKeys, activeProvider, selectedSubModels)

**장점:**
- App.tsx에서 모든 하위 컴포넌트로 props 전달 불필요
- 상태 관리 중앙화
- 여러 컴포넌트에서 쉽게 접근 가능

**Context 구조:**
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// contexts/AISettingsContext.tsx
interface AISettingsContextType {
  apiKeys: Record<string, string>;
  activeProvider: AIProvider;
  selectedSubModels: Record<string, string>;
  setApiKey: (provider: string, key: string) => Promise<void>;
  setActiveProvider: (provider: AIProvider) => void;
}
```

#### 2.2 커스텀 훅 추출

**파일 생성:**
- `hooks/useAuth.ts` - 인증 로직 (AuthContext와 함께 사용)
- `hooks/useAISettings.ts` - AI 설정 관리 (AISettingsContext와 함께 사용)
- `hooks/usePromptTemplates.ts` - 프롬프트 템플릿 관리
- `hooks/useBlogGeneration.ts` - 블로그 생성 워크플로우 (formState, topicSuggestions 등)
- `hooks/useUserCategories.ts` - 사용자 카테고리 관리

**추출할 로직:**
- `App.tsx`의 useState, useEffect 로직을 각 훅으로 이동
- Supabase 동기화 로직 포함
- 관련된 비즈니스 로직 함께 이동

#### 2.3 라우팅 컴포넌트 분리

**파일 생성:**
- `components/AppRouter.tsx` - 메뉴별 라우팅 로직
- `components/PageContainer.tsx` - 공통 페이지 레이아웃 (Header 포함)

**개선된 라우팅 패턴:**
```typescript
// components/AppRouter.tsx
const routes: Record<MenuItem, React.ComponentType<any>> = {
  'home': MainBlogAssistant,
  'ai-settings': AISettingsPage,
  'prompt-settings': PromptSettingsPage,
  'threads-posting': ThreadsAutoPosting,
  'sns-management': SNSManagement,
  'content-history': ContentHistoryPage,
  'insta-content': InstaContentFrame,
  'dark-mode': DarkModeSettings,
};

const AppRouter = ({ activeMenu, ...props }) => {
  const Component = routes[activeMenu] || MainBlogAssistant;
  return <Component {...props} />;
};
```

**장점:**
- 새로운 페이지 추가 시 routes 객체만 수정
- if-else 체인 제거
- 타입 안정성 향상

#### 2.4 App.tsx 리팩토링

**최종 구조:**
```typescript
App.tsx (150-200줄)
├── Context Providers (AuthProvider, AISettingsProvider)
├── 인증 처리 (AuthPage, ThreadsAuthCallback)
├── 레이아웃 (Sidebar, PageContainer)
├── 커스텀 훅 사용 (useAuth, usePromptTemplates, useBlogGeneration)
└── AppRouter 컴포넌트
```

### 구현 순서 (점진적 접근)

**Phase 1: 기반 구조 (3-4시간)**
1. `hooks/` 디렉토리 생성
2. `contexts/` 디렉토리 생성
3. `hooks/useAuth.ts` 추출 (가장 독립적, 30분)
4. `contexts/AuthContext.tsx` 생성 및 App.tsx 적용 (1시간)
5. 즉시 테스트 - 로그인/로그아웃 정상 작동 확인

**Phase 2: AI 설정 분리 (2-3시간)**
6. `hooks/useAISettings.ts` 추출 (1시간)
7. `contexts/AISettingsContext.tsx` 생성 (1시간)
8. AISettingsPage 컴포넌트와 연동
9. 테스트 - API 키 설정 및 동기화 확인

**Phase 3: 라우팅 개선 (1-2시간)**
10. `components/AppRouter.tsx` 생성 (라우팅 로직만, 30분)
11. routes 객체로 조건부 렌더링 개선 (30분)
12. 테스트 - 모든 메뉴 네비게이션 확인

**Phase 4: 나머지 훅 추출 (3-4시간)**
13. `hooks/usePromptTemplates.ts` 추출 (1시간)
14. `hooks/useUserCategories.ts` 추출 (1시간)
15. `hooks/useBlogGeneration.ts` 추출 (가장 복잡, 2시간)
16. 테스트 - 블로그 생성 워크플로우 전체 확인

**Phase 5: 최종 정리 (1시간)**
17. App.tsx 불필요한 코드 제거
18. 타입 정의 정리
19. 전체 기능 테스트
20. 코드 리뷰 및 문서화

**예상 작업 시간: 10-14시간**

---

## 3. 성능 개선: 코드 스플리팅 우선 + 측정 기반 최적화

### 성능 개선 철학

⚠️ **조기 최적화(Premature Optimization) 방지**
- 먼저 성능 측정 (Lighthouse, React DevTools Profiler)
- 실제 병목 지점 파악 후 최적화
- 측정 → 최적화 → 재측정 사이클

### 3.1 코드 스플리팅 (최우선, 즉각적 효과)

**대상 페이지 컴포넌트:**
- `components/AISettingsPage.tsx` (16.6KB)
- `components/ContentHistoryPage.tsx` (23.1KB)
- `components/ThreadsAutoPosting.tsx` (대용량)
- `components/PromptSettingsPage.tsx` (13.2KB)
- `components/InstaContentFrame.tsx`

**적용 방법:**
```typescript
// App.tsx 또는 AppRouter.tsx
import React, { lazy, Suspense } from 'react';
import PageLoader from './components/PageLoader';

const AISettingsPage = lazy(() => import('./components/AISettingsPage'));
const PromptSettingsPage = lazy(() => import('./components/PromptSettingsPage'));
const ThreadsAutoPosting = lazy(() => import('./components/ThreadsAutoPosting'));
const ContentHistoryPage = lazy(() => import('./components/ContentHistoryPage'));
const InstaContentFrame = lazy(() => import('./components/InstaContentFrame'));

// AppRouter에서 사용
<Suspense fallback={<PageLoader />}>
  <AppRouter activeMenu={activeMenu} {...props} />
</Suspense>
```

**PageLoader 컴포넌트 개선:**
```typescript
// components/PageLoader.tsx
const PageLoader = () => (
  <div className="page-loader">
    <Loader />
    <p>페이지를 불러오는 중...</p>
  </div>
);
```

**예상 효과:**
- 초기 번들 크기: 150-200KB → 100-120KB (30-40% 감소)
- 초기 로드 시간: 2-3초 → 1-2초
- 페이지 전환: 즉각적 → 0.2-0.5초 지연 (acceptable)

### 3.2 번들 분석 도구 추가

**package.json 스크립트 추가:**
```json
{
  "scripts": {
    "build": "vite build",
    "analyze": "vite-bundle-visualizer",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite-bundle-visualizer": "^1.0.0"
  }
}
```

**사용 방법:**
```bash
npm run build
npm run analyze
# 브라우저에서 번들 크기 시각화 확인
```

**분석 후 최적화:**
- 불필요한 의존성 제거
- Tree-shaking 확인
- 대용량 라이브러리 대체 검토

### 3.3 React.memo 적용 (선택적)

**성능 측정 후 문제 발견 시만 적용:**

**우선순위:**
1. `components/Header.tsx` - props 변경이 적음 (안정적)
2. `components/Sidebar.tsx` - activeMenu만 변경
3. `components/BlogPostDisplay.tsx` - 큰 컴포넌트, props 안정적

**적용 방법:**
```typescript
// components/Header.tsx
export default React.memo(Header);

// 또는 props 비교 함수 커스터마이징
export default React.memo(Header, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title &&

- `App.tsx`의 useState, useEffect 로직을 각 훅으로 이동
- Supabase 동기화 로직 포함

#### 2.2 라우팅 컴포넌트 분리

**파일 생성:**

- `components/AppRouter.tsx` - 메뉴별 라우팅 로직
- `components/PageContainer.tsx` - 공통 페이지 레이아웃 (Header 포함)

**분리 내용:**

- 조건부 렌더링 로직 (activeMenu에 따른 컴포넌트 렌더링)
- Header 컴포넌트 조건부 렌더링

#### 2.3 App.tsx 리팩토링

**최종 구조:**

```typescript
App.tsx (150-200줄)
├── 인증 처리 (AuthPage, ThreadsAuthCallback)
├── 레이아웃 (Sidebar, PageContainer)
├── 커스텀 훅 사용
└── AppRouter 컴포넌트
```

### 구현 순서

1. 커스텀 훅 생성 (useAuth, useAISettings, usePromptTemplates)
2. useBlogGeneration 훅 생성
3. AppRouter 컴포넌트 생성
4. App.tsx 리팩토링 (훅 및 컴포넌트 사용)
5. 테스트 및 검증

---

## 3. 성능 개선: 메모이제이션 및 코드 스플리팅

### 3.1 React.memo 적용

**대상 컴포넌트:**

- `components/Header.tsx` - props 변경이 적음
- `components/Sidebar.tsx` - activeMenu만 변경
- `components/BlogPostDisplay.tsx` - 큰 컴포넌트, props 안정적
- `components/GeneratedImagesDisplay.tsx` - 리스트 렌더링

**적용 방법:**

```typescript
export default React.memo(Header);
// 또는 props 비교 함수 커스터마이징
export default React.memo(Header, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title && 
         prevProps.subtitle === nextProps.subtitle;
});
```

### 3.4 useMemo/useCallback 적용 (필요시만)

**적용 대상 (성능 문제 발견 시):**

**useMemo:**
### 3.2 useMemo 적용

**대상:**

- `ThreadsAutoPosting.tsx`: 필터링된 materials (pendingMaterials, draftMaterials 등)
- `ContentHistoryPage.tsx`: 필터링/정렬된 콘텐츠 리스트
- `MainBlogAssistant.tsx`: 파싱된 이미지 프롬프트

**예시:**

```typescript
const pendingMaterials = useMemo(() => {
  return materials.filter(m => m.status === 'pending');
}, [materials]);
```

**useCallback:**
- 이벤트 핸들러 함수 (이미 일부 적용됨)
- 자식 컴포넌트에 전달하는 함수 props

### 3.5 추가 성능 최적화 (캐싱 대체)

서버사이드 캐싱 대신 클라이언트 최적화:

**1. Debounce (과도한 API 호출 방지):**
```typescript
import { debounce } from 'lodash-es';

const debouncedGenerate = debounce(generateTopics, 500);
```

**2. 세션 캐시 (브라우저 세션 중 재사용):**
```typescript
const sessionCache = new Map();

const generateWithCache = async (prompt: string) => {
  if (sessionCache.has(prompt)) {
    return sessionCache.get(prompt);
  }
  const result = await generate(prompt);
  sessionCache.set(prompt, result);
  return result;
};
```

**3. ContentHistory 활용 (이전 결과 재사용):**
- 사용자가 "이전 결과 다시 사용" 기능
- 즐겨찾기/북마크 기능

### 구현 순서

**Priority 1 (즉시 시작, 2-3시간):**
1. 코드 스플리팅 적용 (1시간)
2. PageLoader 컴포넌트 생성 (30분)
3. 번들 분석 도구 설치 및 분석 (30분)
4. 테스트 및 성능 측정 (30분)

**Priority 2 (성능 문제 발견 시만, 1-2시간):**
5. React.memo 적용 (Header, Sidebar 등)
6. useMemo 적용 (필터링 로직)
7. useCallback 검토 및 적용

**Priority 3 (선택적, 1-2시간):**
8. Debounce 적용
9. 세션 캐시 구현
10. ContentHistory 재사용 기능

**예상 작업 시간: 2-7시간** (측정 결과에 따라 변동)

---

## 구현 우선순위 (수정됨)

### Phase 1: 구조 개선 + 코드 스플리팅 (가장 ROI 높음) ⭐⭐⭐⭐⭐

**Quick Wins (즉시 시작 가능):**
1. 코드 스플리팅 적용 (1시간, 즉각적 효과)
2. useAuth 훅 추출 (1.5시간, 리팩토링 시작점)
3. 환경변수 제거 (30분, 보안 기본)

**중기 작업 (1-2주):**
4. AuthContext 생성 및 적용 (1시간)
5. AISettingsContext + useAISettings (2시간)
6. AppRouter 컴포넌트 분리 (1시간)
7. 나머지 커스텀 훅 추출 (4시간)
8. 최종 App.tsx 정리 (1시간)

**예상 시간: 12-17시간**

### Phase 2: 보안 개선 (Option B' - Supabase 저장) ⭐⭐⭐⭐

1. Supabase 마이그레이션 (30분)
2. 암호화 유틸리티 추가 (30분)
3. settingsService.ts 수정 (1시간)
4. geminiService.ts 수정 (30분)
5. UI 개선 (30분)
6. 테스트 및 검증 (30분)

**예상 시간: 3-4시간**

### Phase 3: 성능 최적화 (측정 후 진행) ⭐⭐

1. 성능 측정 (Lighthouse, React DevTools)
2. 번들 분석 및 최적화
3. 필요시 React.memo 적용
4. 필요시 useMemo/useCallback 적용

**예상 시간: 1-3시간** (문제 발견 시만)

---

## 예상 작업량

### 전체 예상 시간: 16-24시간

- **Phase 1 (구조 + 코드 스플리팅)**: 12-17시간
- **Phase 2 (보안 Option B')**: 3-4시간
- **Phase 3 (성능 측정 및 최적화)**: 1-3시간

### 작업 분할 제안

**Week 1: Quick Wins**
- Day 1: 코드 스플리팅 (1시간)
- Day 2: useAuth + AuthContext (2.5시간)
- Day 3: 보안 개선 Option B' (3시간)

**Week 2: 구조 개선**
- Day 4-5: AISettingsContext + AppRouter (4시간)
- Day 6-7: 나머지 훅 추출 (6시간)
- Day 8: 최종 정리 및 테스트 (2시간)

**Week 3: 성능 최적화**
- Day 9: 측정 및 분석 (1시간)
- Day 10: 필요시 최적화 적용 (2시간)

---

## 주의사항

1. **하위 호환성**: 기존 localStorage 데이터를 Supabase로 마이그레이션
2. **점진적 리팩토링**: 각 단계마다 테스트 및 커밋
3. **타입 안정성**: TypeScript 타입 정의 유지 및 개선
4. **사용자 경험**: 로딩 상태, 에러 메시지 개선
5. **문서화**: 각 훅과 Context의 사용법 문서화

---

## To-dos

- [ ] **Quick Wins**: 코드 스플리팅 + PageLoader 컴포넌트 생성 (1시간)
- [ ] **Quick Wins**: useAuth 훅 추출 (1.5시간)
- [ ] **Quick Wins**: VITE_GEMINI_API_KEY 환경변수 제거 (30분)
- [ ] **보안 개선**: Supabase 마이그레이션 - encrypted_api_keys 컬럼 추가 (30분)
- [ ] **보안 개선**: crypto-js 설치 및 암호화 유틸리티 구현 (30분)
- [ ] **보안 개선**: settingsService.ts 수정 - Supabase 저장/로드 (1시간)
- [ ] **보안 개선**: localStorage → Supabase 마이그레이션 로직 (30분)
- [ ] **구조 개선**: AuthContext 생성 및 App.tsx 적용 (1시간)
- [ ] **구조 개선**: AISettingsContext + useAISettings 훅 (2시간)
- [ ] **구조 개선**: AppRouter 컴포넌트 생성 (1시간)
- [ ] **구조 개선**: usePromptTemplates, useUserCategories 훅 추출 (2시간)
- [ ] **구조 개선**: useBlogGeneration 훅 추출 (2시간)
- [ ] **구조 개선**: App.tsx 최종 리팩토링 (200줄 이하로 축소) (1시간)
- [ ] **성능 개선**: 번들 분석 도구 설치 및 분석 (30분)
- [ ] **성능 개선**: 성능 측정 (Lighthouse) 및 병목 지점 파악 (30분)
- [ ] **성능 개선**: 필요시 React.memo 적용 (Header, Sidebar, BlogPostDisplay) (1시간)
- [ ] **성능 개선**: 필요시 useMemo/useCallback 적용 (필터링 로직 최적화) (1시간)
### 3.3 useCallback 적용

**대상:**

- 이벤트 핸들러 함수 (이미 일부 적용됨)
- 자식 컴포넌트에 전달하는 함수 props

**확인 필요:**

- `App.tsx`의 모든 핸들러 함수 검토
- `ThreadsAutoPosting.tsx`의 핸들러 함수들

### 3.4 코드 스플리팅 (동적 임포트)

**대상 페이지:**

- `components/AISettingsPage.tsx`
- `components/PromptSettingsPage.tsx`
- `components/ThreadsAutoPosting.tsx`
- `components/ContentHistoryPage.tsx`
- `components/InstaContentFrame.tsx`

**적용 방법:**

```typescript
// App.tsx에서
const AISettingsPage = React.lazy(() => import('./components/AISettingsPage'));
const PromptSettingsPage = React.lazy(() => import('./components/PromptSettingsPage'));

// Suspense로 감싸기
<Suspense fallback={<Loader />}>
  {activeMenu === 'ai-settings' && <AISettingsPage />}
</Suspense>
```

**예상 효과:**

- 초기 번들 크기 감소: 150-200KB → 100-120KB
- 페이지별 지연 로딩으로 초기 로드 시간 단축

### 구현 순서

1. React.memo 적용 (Header, Sidebar 등 안정적인 컴포넌트)
2. useMemo 적용 (필터링/정렬 로직)
3. useCallback 검토 및 적용 (핸들러 함수)
4. 코드 스플리팅 적용 (페이지 컴포넌트)
5. 성능 측정 및 검증

---

## 구현 우선순위

### Phase 1: 보안 (최우선)

1. API 키 프록시 API 구축 또는 환경변수 제거
2. 서비스 레이어 수정

### Phase 2: 구조 개선

1. 커스텀 훅 추출 (useAuth, useAISettings)
2. AppRouter 컴포넌트 분리
3. App.tsx 리팩토링

### Phase 3: 성능 최적화

1. React.memo 적용
2. useMemo/useCallback 적용
3. 코드 스플리팅 적용

---

## 예상 작업량

- **보안 개선**: 2-3시간 (프록시 API 구축 시)
- **구조 개선**: 4-6시간 (커스텀 훅 + 컴포넌트 분리)
- **성능 최적화**: 2-3시간 (메모이제이션 + 코드 스플리팅)
- **테스트 및 검증**: 1-2시간

**총 예상 시간**: 9-14시간

---

## 주의사항

1. **하위 호환성**: 기존 localStorage 데이터 구조 유지
2. **에러 처리**: 프록시 API 실패 시 적절한 폴백 처리
3. **타입 안정성**: TypeScript 타입 정의 유지
4. **테스트**: 각 단계별 기능 테스트 필수

### To-dos

- [ ] API 키 보안: Vercel serverless functions로 Gemini API 프록시 구축 (api/gemini/ 디렉토리)
- [ ] geminiService.ts 수정: 환경변수 제거, 프록시 API 호출로 변경
- [ ] 커스텀 훅 추출: useAuth, useAISettings, usePromptTemplates, useBlogGeneration 생성
- [ ] AppRouter 컴포넌트 생성: 메뉴별 라우팅 로직 분리
- [ ] App.tsx 리팩토링: 커스텀 훅 및 AppRouter 사용하여 200줄 이하로 축소
- [ ] React.memo 적용: Header, Sidebar, BlogPostDisplay 등 안정적인 컴포넌트
- [ ] useMemo 적용: 필터링/정렬된 리스트 계산 최적화
- [ ] 코드 스플리팅: 페이지 컴포넌트 동적 임포트 및 Suspense 적용
