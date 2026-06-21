import { supabase, ContentHistory, getBrowserUserId, isSupabaseConfigured } from '../lib/supabase';

export class HistoryService {
  /**
   * 컨텐츠 저장
   */
  async saveContent(content: Omit<ContentHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ContentHistory | null> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정하세요.');
        return null;
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('content_history')
        .insert({
          ...content,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('컨텐츠 저장 실패:', error);
        console.error('저장 시도한 데이터:', { ...content, user_id: userId });
        console.error('에러 상세:', JSON.stringify(error, null, 2));
        return null;
      }

      return data;
    } catch (err) {
      console.error('컨텐츠 저장 중 오류:', err);
      return null;
    }
  }

  /**
   * 컨텐츠 목록 조회
   */
  async getContentHistory(
    contentType?: 'blog' | 'instagram' | 'threads',
    limit: number = 50
  ): Promise<ContentHistory[]> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const userId = getBrowserUserId();

      let query = supabase!
        .from('content_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('히스토리 조회 실패:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('히스토리 조회 중 오류:', err);
      return [];
    }
  }

  /**
   * 특정 컨텐츠 조회
   */
  async getContentById(id: string): Promise<ContentHistory | null> {
    try {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('content_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('컨텐츠 조회 실패:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('컨텐츠 조회 중 오류:', err);
      return null;
    }
  }

  /**
   * 컨텐츠 업데이트
   */
  async updateContent(
    id: string,
    updates: Partial<Omit<ContentHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<ContentHistory | null> {
    try {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('content_history')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('컨텐츠 업데이트 실패:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('컨텐츠 업데이트 중 오류:', err);
      return null;
    }
  }

  /**
   * 컨텐츠 삭제
   */
  async deleteContent(id: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        return false;
      }

      const userId = getBrowserUserId();

      const { error } = await supabase!
        .from('content_history')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('컨텐츠 삭제 실패:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('컨텐츠 삭제 중 오류:', err);
      return false;
    }
  }

  /**
   * 검색
   */
  async searchContent(searchTerm: string, limit: number = 50): Promise<ContentHistory[]> {
    try {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('content_history')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('검색 실패:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('검색 중 오류:', err);
      return [];
    }
  }

  /**
   * 통계 조회
   */
  async getStatistics(): Promise<{
    total: number;
    byType: { blog: number; instagram: number; threads: number };
  }> {
    try {
      if (!isSupabaseConfigured()) {
        return { total: 0, byType: { blog: 0, instagram: 0, threads: 0 } };
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('content_history')
        .select('content_type')
        .eq('user_id', userId);

      if (error) {
        console.error('통계 조회 실패:', error);
        return { total: 0, byType: { blog: 0, instagram: 0, threads: 0 } };
      }

      const stats = {
        total: data.length,
        byType: {
          blog: data.filter(item => item.content_type === 'blog').length,
          instagram: data.filter(item => item.content_type === 'instagram').length,
          threads: data.filter(item => item.content_type === 'threads').length,
        },
      };

      return stats;
    } catch (err) {
      console.error('통계 조회 중 오류:', err);
      return { total: 0, byType: { blog: 0, instagram: 0, threads: 0 } };
    }
  }
}

// 싱글톤 인스턴스
export const historyService = new HistoryService();
