import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 설정 - 환경 변수에서 가져오기
// 개발 환경: .env.local 파일 사용
// 프로덕션 환경: Vercel 환경 변수 설정 필요
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('=== Supabase 초기화 ===');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('URL에서 프로토콜:', supabaseUrl.split('://')[0]);

// Supabase 클라이언트 생성 (URL과 키가 있을 때만)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url'
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Supabase가 설정되어 있는지 확인
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

// 타입 정의
export interface ContentHistory {
  id?: string;
  user_id: string; // 브라우저 고유 ID (localStorage 기반)
  content_type: 'blog' | 'instagram' | 'threads' | 'threads_persona' | string;
  title: string;
  content: string;
  metadata?: {
    region?: string;
    category?: string;
    keywords?: string;
    targetAudience?: string;
    wordCount?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    [key: string]: any; // 추가 필드 허용
  };
  images?: {
    prompt: string;
    imageUrl: string | null;
    midjourneyPrompt?: string;
    geminiImageUrl?: string | null;
  }[];
  sources?: {
    uri: string;
    title: string;
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface SavedPromptTemplate {
  id?: string;
  user_id: string;
  template_name: string;
  template_type: 'topic' | 'field' | 'blog_post';
  content: string;
  created_at?: string;
  updated_at?: string;
}

// Instagram 포스트 타입
export interface InstagramPost {
  id?: string;
  user_id: string;

  // 콘텐츠
  caption?: string;
  hashtags?: string[];

  // 이미지
  image_url?: string;
  image_data?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    [key: string]: any;
  };

  // AI 생성 정보
  prompt?: string;
  midjourney_prompt?: string;

  // 스케줄링
  scheduled_time?: string;
  publish_status?: 'draft' | 'scheduled' | 'published' | 'failed';
  published_at?: string;

  // Instagram API 정보
  instagram_media_id?: string;
  instagram_permalink?: string;

  // 에러 처리
  error_message?: string;
  retry_count?: number;

  // 카테고리/태깅
  category?: string;
  source?: 'manual' | 'auto' | 'imported';

  // 이미지 합성 관련 (memory-drawer 기능)
  background_url?: string;        // 배경 이미지 URL
  question_text?: string;         // 이미지에 표시될 텍스트

  created_at?: string;
  updated_at?: string;
}

// Instagram 텍스트 풀 타입
export interface InstagramTextPool {
  id?: string;
  user_id: string;

  // 콘텐츠
  text: string;                   // 이미지에 들어갈 질문/텍스트
  caption?: string;               // 캡션

  // 카테고리/태그
  category?: string;
  tags?: string[];

  // 사용 여부
  is_used?: boolean;
  used_at?: string;

  // AI 생성 정보
  ai_generated?: boolean;
  prompt?: string;

  created_at?: string;
  updated_at?: string;
}

// Instagram 계정 정보 타입
export interface InstagramAccount {
  id?: string;
  user_id: string;

  // Instagram API 토큰
  access_token?: string;
  token_expires_at?: string;
  instagram_user_id?: string;
  instagram_username?: string;

  // 프로필 정보
  profile_picture_url?: string;
  followers_count?: number;

  // 설정
  auto_posting_enabled?: boolean;
  default_hashtags?: string[];

  created_at?: string;
  updated_at?: string;
}

// 사용자 ID 가져오기 (인증된 사용자 ID 또는 브라우저 고유 ID)
export const getBrowserUserId = (): string => {
  // Supabase가 설정되어 있으면 인증된 사용자 ID 사용
  if (supabase) {
    // 동기적으로 현재 세션에서 사용자 ID 가져오기
    const sessionData = JSON.parse(
      localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token') || 'null'
    );

    if (sessionData?.user?.id) {
      return sessionData.user.id;
    }
  }

  // Supabase가 없거나 인증되지 않은 경우 브라우저 고유 ID 사용
  let userId = localStorage.getItem('browser_user_id');
  if (!userId) {
    userId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('browser_user_id', userId);
  }
  return userId;
};
