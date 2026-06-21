-- =====================================================
-- AI Blog Generator - Supabase 통합 셋업 스크립트
-- =====================================================
-- 새 Supabase 프로젝트에서 SQL Editor에 이 파일 전체를 붙여넣고 한 번 실행하세요.
-- 포함: 메인 스키마 + Instagram 스키마 + 텍스트 풀 + Storage 버킷/정책
-- (재실행해도 안전하도록 IF NOT EXISTS / DROP IF EXISTS 처리됨)
-- =====================================================


-- =====================================================
-- 1) 메인 스키마 (content_history, user_settings)
-- =====================================================

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

CREATE INDEX IF NOT EXISTS idx_content_history_user_id ON content_history(user_id);
CREATE INDEX IF NOT EXISTS idx_content_history_content_type ON content_history(content_type);
CREATE INDEX IF NOT EXISTS idx_content_history_created_at ON content_history(created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    ai_settings JSONB DEFAULT '{}'::jsonb,
    prompt_templates JSONB DEFAULT '{}'::jsonb,
    sns_channels JSONB DEFAULT '[]'::jsonb,
    threads_tokens JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- updated_at 자동 업데이트 트리거 함수
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

DROP TRIGGER IF EXISTS update_content_history_updated_at ON content_history;
CREATE TRIGGER update_content_history_updated_at
    BEFORE UPDATE ON content_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own content" ON content_history;
DROP POLICY IF EXISTS "Users can insert their own content" ON content_history;
DROP POLICY IF EXISTS "Users can update their own content" ON content_history;
DROP POLICY IF EXISTS "Users can delete their own content" ON content_history;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

CREATE POLICY "Users can view their own content" ON content_history FOR SELECT
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can insert their own content" ON content_history FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can update their own content" ON content_history FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can delete their own content" ON content_history FOR DELETE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');

CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can delete their own settings" ON user_settings FOR DELETE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');


-- =====================================================
-- 2) Instagram 스키마 (instagram_posts, instagram_accounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS instagram_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    caption TEXT,
    hashtags TEXT[],
    image_url TEXT,
    image_data JSONB DEFAULT '{}'::jsonb,
    prompt TEXT,
    midjourney_prompt TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    publish_status TEXT DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    instagram_media_id TEXT,
    instagram_permalink TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    category TEXT,
    source TEXT DEFAULT 'manual',
    -- instagram-schema-update.sql 통합: 배경 합성 필드
    background_url TEXT,
    question_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id ON instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_status ON instagram_posts(publish_status);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_scheduled ON instagram_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_created_at ON instagram_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS instagram_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    instagram_user_id TEXT,
    instagram_username TEXT,
    profile_picture_url TEXT,
    followers_count INTEGER,
    auto_posting_enabled BOOLEAN DEFAULT false,
    default_hashtags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);

DROP TRIGGER IF EXISTS update_instagram_posts_updated_at ON instagram_posts;
CREATE TRIGGER update_instagram_posts_updated_at
    BEFORE UPDATE ON instagram_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
    BEFORE UPDATE ON instagram_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can insert their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can update their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can delete their own instagram posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can view their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can insert their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can update their own instagram account" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can delete their own instagram account" ON instagram_accounts;

CREATE POLICY "Users can view their own instagram posts" ON instagram_posts FOR SELECT
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can insert their own instagram posts" ON instagram_posts FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can update their own instagram posts" ON instagram_posts FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can delete their own instagram posts" ON instagram_posts FOR DELETE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');

CREATE POLICY "Users can view their own instagram account" ON instagram_accounts FOR SELECT
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can insert their own instagram account" ON instagram_accounts FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can update their own instagram account" ON instagram_accounts FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can delete their own instagram account" ON instagram_accounts FOR DELETE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');


-- =====================================================
-- 3) Instagram 텍스트 풀 (instagram_text_pool)
-- =====================================================

CREATE TABLE IF NOT EXISTS instagram_text_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    caption TEXT,
    category TEXT,
    tags TEXT[],
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    ai_generated BOOLEAN DEFAULT false,
    prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_user_id ON instagram_text_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_is_used ON instagram_text_pool(is_used);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_category ON instagram_text_pool(category);
CREATE INDEX IF NOT EXISTS idx_instagram_text_pool_created_at ON instagram_text_pool(created_at DESC);

DROP TRIGGER IF EXISTS update_instagram_text_pool_updated_at ON instagram_text_pool;
CREATE TRIGGER update_instagram_text_pool_updated_at
    BEFORE UPDATE ON instagram_text_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE instagram_text_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can insert their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can update their own text pool" ON instagram_text_pool;
DROP POLICY IF EXISTS "Users can delete their own text pool" ON instagram_text_pool;

CREATE POLICY "Users can view their own text pool" ON instagram_text_pool FOR SELECT
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can insert their own text pool" ON instagram_text_pool FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can update their own text pool" ON instagram_text_pool FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');
CREATE POLICY "Users can delete their own text pool" ON instagram_text_pool FOR DELETE
    USING (auth.uid()::text = user_id OR user_id LIKE 'browser_%');


-- =====================================================
-- 4) Storage 버킷 + 정책 (instagram-backgrounds, instagram-posts)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-backgrounds', 'instagram-backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-posts', 'instagram-posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read access for backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON storage.objects;

CREATE POLICY "Public read access for backgrounds" ON storage.objects FOR SELECT
    USING (bucket_id = 'instagram-backgrounds');
CREATE POLICY "Authenticated users can upload backgrounds" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'instagram-backgrounds' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update backgrounds" ON storage.objects FOR UPDATE
    USING (bucket_id = 'instagram-backgrounds' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete backgrounds" ON storage.objects FOR DELETE
    USING (bucket_id = 'instagram-backgrounds' AND auth.role() = 'authenticated');

CREATE POLICY "Public read access for posts" ON storage.objects FOR SELECT
    USING (bucket_id = 'instagram-posts');
CREATE POLICY "Authenticated users can upload posts" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'instagram-posts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update posts" ON storage.objects FOR UPDATE
    USING (bucket_id = 'instagram-posts' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete posts" ON storage.objects FOR DELETE
    USING (bucket_id = 'instagram-posts' AND auth.role() = 'authenticated');


-- =====================================================
SELECT '✅ Supabase 통합 셋업 완료 (테이블 5개 + 스토리지 버킷 2개)' AS result;
