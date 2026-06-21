-- Supabase 테이블 정리 스크립트
-- 사용하지 않는 테이블을 안전하게 제거합니다

-- ⚠️ 주의: 이 작업은 되돌릴 수 없습니다!
-- 실행하기 전에 데이터 백업을 권장합니다.

-- ========================================
-- saved_prompt_templates 테이블 삭제
-- ========================================

-- 1. 트리거 삭제
DROP TRIGGER IF EXISTS update_prompt_templates_updated_at ON saved_prompt_templates;

-- 2. RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view their own templates" ON saved_prompt_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON saved_prompt_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON saved_prompt_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON saved_prompt_templates;

-- 3. 인덱스 삭제
DROP INDEX IF EXISTS idx_prompt_templates_user_id;
DROP INDEX IF EXISTS idx_prompt_templates_type;

-- 4. 테이블 삭제
DROP TABLE IF EXISTS saved_prompt_templates;

-- 완료 메시지
SELECT '✅ saved_prompt_templates 테이블이 삭제되었습니다.' AS result;

-- ========================================
-- 정리 완료 확인
-- ========================================

-- 현재 남아있는 테이블 목록 확인
SELECT
    table_name,
    CASE
        WHEN table_name IN ('content_history', 'user_settings', 'instagram_posts', 'instagram_accounts')
        THEN '✅ 사용 중'
        ELSE '⚠️ 확인 필요'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
