import { supabase, getBrowserUserId, type InstagramTextPool } from '../lib/supabase';

/**
 * Instagram Text Pool Service
 * 텍스트 풀 관리를 위한 CRUD 서비스
 */

/**
 * 텍스트 풀 목록 조회
 */
export const getTextPool = async (filters?: {
  category?: string;
  isUsed?: boolean;
  limit?: number;
}): Promise<InstagramTextPool[]> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const userId = getBrowserUserId();
    let query = supabase
      .from('instagram_text_pool')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.isUsed !== undefined) {
      query = query.eq('is_used', filters.isUsed);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ 텍스트 풀 조회 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀 단일 항목 조회
 */
export const getTextPoolById = async (id: string): Promise<InstagramTextPool | null> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const { data, error } = await supabase
      .from('instagram_text_pool')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ 텍스트 풀 항목 조회 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀에 새 항목 추가
 */
export const addTextToPool = async (
  textData: Omit<InstagramTextPool, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<InstagramTextPool> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const userId = getBrowserUserId();

    const newText: Partial<InstagramTextPool> = {
      user_id: userId,
      ...textData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('instagram_text_pool')
      .insert([newText])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ 텍스트 풀에 추가 완료:', data);
    return data;
  } catch (error) {
    console.error('❌ 텍스트 풀 추가 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀 항목 수정
 */
export const updateTextPoolItem = async (
  id: string,
  updates: Partial<InstagramTextPool>
): Promise<InstagramTextPool> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const { data, error } = await supabase
      .from('instagram_text_pool')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ 텍스트 풀 항목 수정 완료:', data);
    return data;
  } catch (error) {
    console.error('❌ 텍스트 풀 항목 수정 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀 항목을 사용됨으로 표시
 */
export const markTextAsUsed = async (id: string): Promise<InstagramTextPool> => {
  try {
    return await updateTextPoolItem(id, {
      is_used: true,
      used_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 텍스트 사용 표시 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀 항목 삭제
 */
export const deleteTextPoolItem = async (id: string): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const { error } = await supabase
      .from('instagram_text_pool')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('✅ 텍스트 풀 항목 삭제 완료');
  } catch (error) {
    console.error('❌ 텍스트 풀 항목 삭제 실패:', error);
    throw error;
  }
};

/**
 * 사용하지 않은 랜덤 텍스트 가져오기
 */
export const getRandomUnusedText = async (category?: string): Promise<InstagramTextPool | null> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const userId = getBrowserUserId();
    let query = supabase
      .from('instagram_text_pool')
      .select('*')
      .eq('user_id', userId)
      .eq('is_used', false);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // 랜덤 선택
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];
  } catch (error) {
    console.error('❌ 랜덤 텍스트 조회 실패:', error);
    throw error;
  }
};

/**
 * AI로 텍스트 풀에 여러 질문 생성 및 추가
 */
export const generateAndAddTexts = async (
  prompt: string,
  count: number = 10,
  category?: string
): Promise<InstagramTextPool[]> => {
  try {
    // AI 생성은 geminiService를 통해 처리
    // 여기서는 생성된 텍스트들을 받아서 DB에 저장
    const results: InstagramTextPool[] = [];

    // TODO: Gemini API로 여러 질문 생성 로직 구현
    // 현재는 placeholder
    console.log('⚠️ AI 텍스트 대량 생성 기능은 구현 예정입니다.');

    return results;
  } catch (error) {
    console.error('❌ AI 텍스트 생성 실패:', error);
    throw error;
  }
};

/**
 * 카테고리 목록 조회
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const userId = getBrowserUserId();
    const { data, error } = await supabase
      .from('instagram_text_pool')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null);

    if (error) {
      throw error;
    }

    // 중복 제거
    const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
    return categories as string[];
  } catch (error) {
    console.error('❌ 카테고리 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 텍스트 풀 통계 조회
 */
export const getTextPoolStats = async (): Promise<{
  total: number;
  used: number;
  unused: number;
  aiGenerated: number;
}> => {
  try {
    if (!supabase) {
      throw new Error('Supabase가 설정되지 않았습니다.');
    }

    const userId = getBrowserUserId();

    const { data, error } = await supabase
      .from('instagram_text_pool')
      .select('is_used, ai_generated')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const total = data.length;
    const used = data.filter(item => item.is_used).length;
    const unused = total - used;
    const aiGenerated = data.filter(item => item.ai_generated).length;

    return { total, used, unused, aiGenerated };
  } catch (error) {
    console.error('❌ 텍스트 풀 통계 조회 실패:', error);
    throw error;
  }
};
