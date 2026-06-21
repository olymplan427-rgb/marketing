-- Supabase 데이터베이스 스키마 (정리된 버전)
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. 컨텐츠 히스토리 테이블
CREATE TABLE IF NOT EXISTS content_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'instagram', 'threads')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_content_history_user_id ON content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_history_content_type ON content_history(content_type);
CREATE INDEX IF NOT EXISTS idx_content_history_created_at ON content_history(created_at DESC);

-- 2. 사용자 설정 테이블
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    ai_settings JSONB DEFAULT '{}'::jsonb,
    prompt_templates JSONB DEFAULT '{}'::jsonb,
    sns_channels JSONB DEFAULT '[]'::jsonb,
    threads_tokens JSONB DEFAULT NULL, -- Threads 인증 토큰 저장 (다른 브라우저와 공유)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 3. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- content_history 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_content_history_updated_at ON content_history;
CREATE TRIGGER update_content_history_updated_at
    BEFORE UPDATE ON content_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- user_settings 테이블에 트리거 추가
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 정책 설정
-- 모든 사용자가 자신의 데이터에만 접근 가능하도록 설정
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Users can view their own content" ON content_history;
DROP POLICY IF EXISTS "Users can insert their own content" ON content_history;
DROP POLICY IF EXISTS "Users can update their own content" ON content_history;
DROP POLICY IF EXISTS "Users can delete their own content" ON content_history;

DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

-- 인증된 사용자만 자신의 데이터에 접근 가능
CREATE POLICY "Users can view their own content"
    ON content_history FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%' -- 기존 브라우저 ID 지원
    );

CREATE POLICY "Users can insert their own content"
    ON content_history FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%' -- 기존 브라우저 ID 지원
    );

CREATE POLICY "Users can update their own content"
    ON content_history FOR UPDATE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%' -- 기존 브라우저 ID 지원
    );

CREATE POLICY "Users can delete their own content"
    ON content_history FOR DELETE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%' -- 기존 브라우저 ID 지원
    );

-- 사용자 설정도 동일하게 설정
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can delete their own settings"
    ON user_settings FOR DELETE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

-- 완료!
-- 이제 애플리케이션에서 이 테이블들을 사용할 수 있습니다.
