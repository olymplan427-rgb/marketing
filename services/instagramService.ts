/**
 * Instagram Service
 * Instagram Graph API 및 Supabase 통합 서비스
 *
 * 주요 기능:
 * - Instagram 포스트 CRUD
 * - 이미지 업로드 (Supabase Storage)
 * - 스케줄링 관리
 * - (향후) Instagram Graph API 연동
 */

import { supabase, getBrowserUserId, isSupabaseConfigured, InstagramPost } from '../lib/supabase';

/**
 * Instagram 포스트 저장
 */
export async function saveInstagramPost(post: Omit<InstagramPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<InstagramPost | null> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return null;
  }

  try {
    const userId = getBrowserUserId();

    const { data, error } = await supabase!
      .from('instagram_posts')
      .insert({
        ...post,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Instagram 포스트 저장 실패:', error);
      return null;
    }

    return data as InstagramPost;
  } catch (error) {
    console.error('Instagram 포스트 저장 중 오류:', error);
    return null;
  }
}

/**
 * Instagram 포스트 목록 조회
 */
export async function getInstagramPosts(
  status?: 'draft' | 'scheduled' | 'published' | 'failed',
  limit: number = 50
): Promise<InstagramPost[]> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return [];
  }

  try {
    const userId = getBrowserUserId();

    let query = supabase!
      .from('instagram_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('publish_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Instagram 포스트 조회 실패:', error);
      return [];
    }

    return (data as InstagramPost[]) || [];
  } catch (error) {
    console.error('Instagram 포스트 조회 중 오류:', error);
    return [];
  }
}

/**
 * Instagram 포스트 단일 조회
 */
export async function getInstagramPost(id: string): Promise<InstagramPost | null> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return null;
  }

  try {
    const userId = getBrowserUserId();

    const { data, error } = await supabase!
      .from('instagram_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Instagram 포스트 조회 실패:', error);
      return null;
    }

    return data as InstagramPost;
  } catch (error) {
    console.error('Instagram 포스트 조회 중 오류:', error);
    return null;
  }
}

/**
 * Instagram 포스트 업데이트
 */
export async function updateInstagramPost(
  id: string,
  updates: Partial<Omit<InstagramPost, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<InstagramPost | null> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return null;
  }

  try {
    const userId = getBrowserUserId();

    const { data, error } = await supabase!
      .from('instagram_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Instagram 포스트 업데이트 실패:', error);
      return null;
    }

    return data as InstagramPost;
  } catch (error) {
    console.error('Instagram 포스트 업데이트 중 오류:', error);
    return null;
  }
}

/**
 * Instagram 포스트 삭제
 */
export async function deleteInstagramPost(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return false;
  }

  try {
    const userId = getBrowserUserId();

    // 먼저 포스트 정보 가져오기 (이미지 URL 확인)
    const post = await getInstagramPost(id);

    // 포스트 삭제
    const { error } = await supabase!
      .from('instagram_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Instagram 포스트 삭제 실패:', error);
      return false;
    }

    // 이미지가 Supabase Storage에 있으면 삭제
    if (post?.image_url && post.image_url.includes('supabase')) {
      await deleteInstagramImage(post.image_url);
    }

    return true;
  } catch (error) {
    console.error('Instagram 포스트 삭제 중 오류:', error);
    return false;
  }
}

/**
 * Instagram 이미지 업로드 (Supabase Storage)
 */
export async function uploadInstagramImage(file: File): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return null;
  }

  try {
    const userId = getBrowserUserId();
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}-${file.name}`;

    const { data, error } = await supabase!.storage
      .from('instagram-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('이미지 업로드 실패:', error);
      return null;
    }

    // Public URL 생성
    const { data: urlData } = supabase!.storage
      .from('instagram-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('이미지 업로드 중 오류:', error);
    return null;
  }
}

/**
 * Instagram 이미지 삭제 (Supabase Storage)
 */
export async function deleteInstagramImage(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.error('Supabase가 설정되지 않았습니다.');
    return false;
  }

  try {
    // URL에서 파일 경로 추출
    const urlParts = imageUrl.split('/instagram-images/');
    if (urlParts.length < 2) {
      console.error('유효하지 않은 이미지 URL:', imageUrl);
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase!.storage
      .from('instagram-images')
      .remove([filePath]);

    if (error) {
      console.error('이미지 삭제 실패:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('이미지 삭제 중 오류:', error);
    return false;
  }
}

/**
 * Instagram 포스트 통계
 */
export async function getInstagramPostStats(): Promise<{
  total: number;
  byStatus: {
    draft: number;
    scheduled: number;
    published: number;
    failed: number;
  };
}> {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      byStatus: { draft: 0, scheduled: 0, published: 0, failed: 0 }
    };
  }

  try {
    const userId = getBrowserUserId();

    const { data, error } = await supabase!
      .from('instagram_posts')
      .select('publish_status')
      .eq('user_id', userId);

    if (error) {
      console.error('Instagram 통계 조회 실패:', error);
      return {
        total: 0,
        byStatus: { draft: 0, scheduled: 0, published: 0, failed: 0 }
      };
    }

    const stats = {
      total: data.length,
      byStatus: {
        draft: data.filter(p => p.publish_status === 'draft').length,
        scheduled: data.filter(p => p.publish_status === 'scheduled').length,
        published: data.filter(p => p.publish_status === 'published').length,
        failed: data.filter(p => p.publish_status === 'failed').length,
      }
    };

    return stats;
  } catch (error) {
    console.error('Instagram 통계 조회 중 오류:', error);
    return {
      total: 0,
      byStatus: { draft: 0, scheduled: 0, published: 0, failed: 0 }
    };
  }
}

/**
 * 스케줄된 포스트 중 발행 시간이 된 포스트 조회
 * (Cron Job에서 사용)
 */
export async function getScheduledPostsToPublish(): Promise<InstagramPost[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase!
      .from('instagram_posts')
      .select('*')
      .eq('publish_status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(10);

    if (error) {
      console.error('스케줄된 포스트 조회 실패:', error);
      return [];
    }

    return (data as InstagramPost[]) || [];
  } catch (error) {
    console.error('스케줄된 포스트 조회 중 오류:', error);
    return [];
  }
}

// 기본 export
export const instagramService = {
  savePost: saveInstagramPost,
  getPosts: getInstagramPosts,
  getPost: getInstagramPost,
  updatePost: updateInstagramPost,
  deletePost: deleteInstagramPost,
  uploadImage: uploadInstagramImage,
  deleteImage: deleteInstagramImage,
  getStats: getInstagramPostStats,
  getScheduledPostsToPublish,
};
