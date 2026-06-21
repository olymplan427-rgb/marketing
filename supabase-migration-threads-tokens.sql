-- Threads 토큰 저장을 위한 마이그레이션 SQL
-- 기존 user_settings 테이블에 threads_tokens 컬럼 추가

-- 1. threads_tokens 컬럼 추가 (이미 있으면 오류 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'threads_tokens'
    ) THEN
        ALTER TABLE user_settings 
        ADD COLUMN threads_tokens JSONB DEFAULT NULL;
        
        COMMENT ON COLUMN user_settings.threads_tokens IS 'Threads 인증 토큰 저장 (다른 브라우저와 공유)';
    END IF;
END $$;

-- 완료!
-- 이제 Threads 토큰이 Supabase에 저장되어 다른 브라우저에서도 접근 가능합니다.

