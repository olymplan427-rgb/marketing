-- Instagram 통합 스키마 업데이트
-- 기존 instagram-schema.sql에 추가 실행

-- 1. instagram_posts 테이블에 필드 추가
ALTER TABLE instagram_posts
ADD COLUMN IF NOT EXISTS background_url TEXT,
ADD COLUMN IF NOT EXISTS question_text TEXT;

-- 2. 텍스트 풀 관리 테이블 생성
CREATE TABLE IF NOT EXISTS instagram_text_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- 콘텐츠
    text TEXT NOT NULL,                 -- 이미지에 들어갈 질문/텍스트
    caption TEXT,                       -- 캡션

    -- 카테고리/태그
    category TEXT,                      -- 카테고리
    tags TEXT[],                        -- 태그

    -- 사용 여부
    is_used BOOLEAN DEFAULT false,      -- 사용 여부
    used_at TIMESTAMP WITH TIME ZONE,   -- 사용된 시간

    -- AI 생성 정보
    ai_generated BOOLEAN DEFAULT false, -- AI로 생성되었는지
    prompt TEXT,                        -- AI 생성시 사용한 프롬프트

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_user_id ON instagram_text_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_is_used ON instagram_text_pool(is_used);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_category ON instagram_text_pool(category);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_created_at ON instagram_text_pool(created_at DESC);

-- 트리거
DROP TRIGGER IF EXISTS update_instagram_text_pool_updated_at ON instagram_text_pool;
CREATE TRIGGER update_instagram_text_pool_updated_at
    BEFORE UPDATE ON instagram_text_pool
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE instagram_text_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can insert their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can update their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can delete their own text pool" ON instagram_text_pool;

CREATE POLICY "Users can view their own text pool"
    ON instagram_text_pool FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can insert their own text pool"
    ON instagram_text_pool FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can update their own text pool"
    ON instagram_text_pool FOR UPDATE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can delete their own text pool"
    ON instagram_text_pool FOR DELETE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

-- 완료
SELECT '✅ Instagram 스키마 업데이트 완료' AS result;
