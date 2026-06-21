# Supabase 설정 가이드

이 가이드는 AI 블로그 포스트 생성기에 Supabase를 연동하여 컨텐츠 히스토리를 저장하는 방법을 안내합니다.

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 대시보드 접속
- https://supabase.com 에 로그인
- 프로젝트 대시보드로 이동

### 1.2 API 키 확인
1. 좌측 메뉴에서 `Settings` 클릭
2. `API` 메뉴 선택
3. 다음 정보를 복사:
   - **Project URL** (예: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** 키 (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 2. 로컬 환경 설정

### 2.1 환경 변수 파일 생성
프로젝트 루트에 `.env` 파일을 생성하거나 수정:

```bash
# .env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**중요**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 업로드되지 않습니다.

## 3. 데이터베이스 스키마 생성

### 3.1 SQL Editor 접속
1. Supabase 대시보드 좌측 메뉴에서 `SQL Editor` 클릭
2. `New query` 버튼 클릭

### 3.2 테이블 생성 SQL 실행
프로젝트의 `supabase-schema.sql` 파일 내용을 복사하여 SQL Editor에 붙여넣고 실행:

```sql
-- supabase-schema.sql의 내용을 여기에 붙여넣고 실행
```

또는 터미널에서:
```bash
cat supabase-schema.sql
```

실행 후 다음 테이블이 생성됩니다:
- **content_history**: 생성된 컨텐츠 저장
- **saved_prompt_templates**: 프롬프트 템플릿 저장 (선택사항)

### 3.3 테이블 확인
1. 좌측 메뉴에서 `Table Editor` 클릭
2. `content_history` 테이블이 생성되었는지 확인

## 4. 개발 서버 실행

```bash
npm run dev
```

서버가 시작되면 `컨텐츠 히스토리` 메뉴에서 저장된 컨텐츠를 확인할 수 있습니다.

## 5. 주요 기능

### 5.1 컨텐츠 자동 저장 (구현 예정)
- 블로그 포스트 생성 시 자동 저장
- 인스타그램/쓰레드 컨텐츠 저장
- 생성된 이미지 포함 저장

### 5.2 히스토리 조회
- 타입별 필터링 (블로그/인스타그램/쓰레드)
- 검색 기능
- 상세 보기 모달

### 5.3 통계
- 전체 컨텐츠 수
- 타입별 컨텐츠 수

## 6. 데이터 구조

### content_history 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 ID (자동 생성) |
| user_id | TEXT | 브라우저 고유 ID |
| content_type | TEXT | 컨텐츠 타입 (blog/instagram/threads) |
| title | TEXT | 제목 |
| content | TEXT | 본문 내용 |
| metadata | JSONB | 추가 메타데이터 (카테고리, 키워드 등) |
| images | JSONB | 생성된 이미지 정보 |
| sources | JSONB | 참고 자료 출처 |
| created_at | TIMESTAMP | 생성 시간 |
| updated_at | TIMESTAMP | 수정 시간 |

## 7. 보안 설정 (RLS)

현재 설정:
- **Row Level Security (RLS)** 활성화
- 모든 사용자가 자신의 `user_id`로 저장된 데이터만 조회/수정/삭제 가능
- 브라우저 기반 ID로 데이터 구분

나중에 인증을 추가하려면:
- Supabase Auth 활성화
- RLS 정책 업데이트하여 `auth.uid()` 사용

## 8. 문제 해결

### Q: "Failed to fetch" 에러가 발생해요
**A**: `.env` 파일의 Supabase URL과 API 키를 확인하세요.

### Q: 데이터가 저장되지 않아요
**A**:
1. Supabase 대시보드에서 테이블이 정상적으로 생성되었는지 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. RLS 정책이 올바르게 설정되었는지 확인

### Q: 다른 브라우저에서 데이터가 보이지 않아요
**A**: Supabase Auth 인증을 사용하면 여러 브라우저/기기에서 데이터를 동기화할 수 있습니다. 로그인하면 같은 계정의 데이터에 접근할 수 있습니다.

### Q: Threads 연동 상태가 다른 브라우저에서 보이지 않아요
**A**: 
1. `supabase-migration-threads-tokens.sql` 파일을 Supabase SQL Editor에서 실행하세요.
2. 이 파일은 `user_settings` 테이블에 `threads_tokens` 컬럼을 추가합니다.
3. 마이그레이션 후 Threads 토큰이 Supabase에 저장되어 모든 브라우저에서 공유됩니다.

## 9. 향후 개선 사항

- [ ] 블로그 포스트 생성 시 자동 저장 기능 추가
- [ ] 인스타그램/쓰레드 컨텐츠 저장 기능 추가
- [ ] 컨텐츠 수정 기능
- [ ] 컨텐츠 복사/내보내기 기능
- [ ] 태그 관리
- [ ] Supabase Auth 연동 (선택사항)
- [ ] 파일 업로드 (이미지 저장을 Supabase Storage로)

## 10. 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript)
- [Row Level Security (RLS) 가이드](https://supabase.com/docs/guides/auth/row-level-security)
