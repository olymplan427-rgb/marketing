-- Instagram 포스트 통합을 위한 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. Instagram 포스트 테이블
CREATE TABLE IF NOT EXISTS instagram_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,

    -- 콘텐츠
    caption TEXT,                           -- 포스트 텍스트 (캡션)
    hashtags TEXT[],                        -- 해시태그 배열

    -- 이미지
    image_url TEXT,                         -- Supabase Storage URL 또는 외부 URL
    image_data JSONB DEFAULT '{}'::jsonb,  -- 이미지 메타데이터 (크기, 형식 등)

    -- AI 생성 정보
    prompt TEXT,                            -- 이미지 생성 프롬프트
    midjourney_prompt TEXT,                 -- Midjourney용 프롬프트

    -- 스케줄링
    scheduled_time TIMESTAMP WITH TIME ZONE,          -- 예약 발행 시간
    publish_status TEXT DEFAULT 'draft',              -- draft, scheduled, published, failed
    published_at TIMESTAMP WITH TIME ZONE,            -- 실제 발행 시간

    -- Instagram API 정보
    instagram_media_id TEXT,                -- Instagram 미디어 ID
    instagram_permalink TEXT,               -- Instagram 게시물 링크

    -- 에러 처리
    error_message TEXT,                     -- 실패 시 에러 메시지
    retry_count INTEGER DEFAULT 0,          -- 재시도 횟수

    -- 카테고리/태깅
    category TEXT,                          -- 카테고리
    source TEXT DEFAULT 'manual',           -- manual, auto, imported

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id ON instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_status ON instagram_posts(publish_status);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_scheduled ON instagram_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_created_at ON instagram_posts(created_at DESC);

-- 2. Instagram 계정 연동 정보 테이블
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,

    -- Instagram API 토큰
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    instagram_user_id TEXT,
    instagram_username TEXT,

    -- 프로필 정보
    profile_picture_url TEXT,
    followers_count INTEGER,

    -- 설정
    auto_posting_enabled BOOLEAN DEFAULT false,
    default_hashtags TEXT[],

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);

-- 3. updated_at 자동 업데이트 트리거
-- (트리거 함수는 이미 supabase-schema.sql에 정의되어 있음)

DROP TRIGGER IF EXISTS update_instagram_posts_updated_at ON instagram_posts;
CREATE TRIGGER update_instagram_posts_updated_at
    BEFORE UPDATE ON instagram_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
    BEFORE UPDATE ON instagram_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS (Row Level Security) 정책 설정
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Users can view their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can insert their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can update their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can delete their own instagram posts" ON instagram_posts;

DROP POLICY IF EXISTS "Users can view their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can insert their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can update their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can delete their own instagram account" ON instagram_accounts;

-- instagram_posts 정책
CREATE POLICY "Users can view their own instagram posts"
    ON instagram_posts FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%' -- 브라우저 ID 지원
    );

CREATE POLICY "Users can insert their own instagram posts"
    ON instagram_posts FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can update their own instagram posts"
    ON instagram_posts FOR UPDATE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can delete their own instagram posts"
    ON instagram_posts FOR DELETE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

-- instagram_accounts 정책
CREATE POLICY "Users can view their own instagram account"
    ON instagram_accounts FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can insert their own instagram account"
    ON instagram_accounts FOR INSERT
    WITH CHECK (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can update their own instagram account"
    ON instagram_accounts FOR UPDATE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

CREATE POLICY "Users can delete their own instagram account"
    ON instagram_accounts FOR DELETE
    USING (
        auth.uid()::text = user_id OR
        user_id LIKE 'browser_%'
    );

-- 완료!
-- 이제 Instagram 포스트 관리를 위한 테이블이 준비되었습니다.
