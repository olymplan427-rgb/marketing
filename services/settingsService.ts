import { supabase, getBrowserUserId, isSupabaseConfigured } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id: string;
  ai_settings: {
    provider?: 'gemini' | 'openai' | 'anthropic';
    geminiApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
  };
  prompt_templates: {
    topic?: string;
    field?: string;
    blogPost?: string;
    midjourneyPrompt?: string;
    imagenPrompt?: string;
  };
  sns_channels: Array<{
    id: string;
    platform: string;
    url: string;
    addedDate: string;
  }>;
  threads_tokens?: {
    access_token: string;
    user_id: string;
    expires_in?: number;
    timestamp?: number;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export class SettingsService {
  /**
   * 사용자 설정 가져오기
   */
  async getSettings(): Promise<UserSettings | null> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase가 설정되지 않았습니다.');
        return null;
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 레코드가 없으면 기본값 반환
        if (error.code === 'PGRST116') {
          return this.createDefaultSettings();
        }
        console.error('설정 조회 실패:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('설정 조회 중 오류:', err);
      return null;
    }
  }

  /**
   * 사용자 설정 저장/업데이트
   */
  async saveSettings(settings: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettings | null> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase가 설정되지 않았습니다.');
        return null;
      }

      const userId = getBrowserUserId();

      // 기존 설정 확인
      const existing = await this.getSettings();

      if (existing && existing.id) {
        // 업데이트
        const { data, error } = await supabase!
          .from('user_settings')
          .update(settings)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('설정 업데이트 실패:', error);
          return null;
        }

        return data;
      } else {
        // 새로 생성
        const { data, error } = await supabase!
          .from('user_settings')
          .insert({
            user_id: userId,
            ai_settings: settings.ai_settings || {},
            prompt_templates: settings.prompt_templates || {},
            sns_channels: settings.sns_channels || [],
          })
          .select()
          .single();

        if (error) {
          console.error('설정 생성 실패:', error);
          return null;
        }

        return data;
      }
    } catch (err) {
      console.error('설정 저장 중 오류:', err);
      return null;
    }
  }

  /**
   * AI 설정만 업데이트 (부분 업데이트)
   */
  async updateAISettings(aiSettings: UserSettings['ai_settings']): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        return false;
      }

      const userId = getBrowserUserId();

      // 먼저 레코드가 있는지 확인
      const { data: existing } = await supabase!
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // 레코드가 없으면 새로 생성
        const { error } = await supabase!
          .from('user_settings')
          .insert({
            user_id: userId,
            ai_settings: aiSettings,
            prompt_templates: {},
            sns_channels: [],
          });

        if (error) {
          console.error('AI 설정 생성 실패:', error);
          return false;
        }
        return true;
      }

      // 레코드가 있으면 ai_settings 필드만 업데이트
      const { error } = await supabase!
        .from('user_settings')
        .update({ ai_settings: aiSettings })
        .eq('user_id', userId);

      if (error) {
        console.error('AI 설정 업데이트 실패:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('AI 설정 업데이트 중 오류:', err);
      return false;
    }
  }

  /**
   * 프롬프트 템플릿만 업데이트 (부분 업데이트)
   */
  async updatePromptTemplates(promptTemplates: UserSettings['prompt_templates']): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        return false;
      }

      const userId = getBrowserUserId();

      // 먼저 레코드가 있는지 확인
      const { data: existing } = await supabase!
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // 레코드가 없으면 새로 생성
        const { error } = await supabase!
          .from('user_settings')
          .insert({
            user_id: userId,
            ai_settings: {},
            prompt_templates: promptTemplates,
            sns_channels: [],
          });

        if (error) {
          console.error('프롬프트 템플릿 생성 실패:', error);
          return false;
        }
        return true;
      }

      // 레코드가 있으면 prompt_templates 필드만 업데이트
      const { error } = await supabase!
        .from('user_settings')
        .update({ prompt_templates: promptTemplates })
        .eq('user_id', userId);

      if (error) {
        console.error('프롬프트 템플릿 업데이트 실패:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('프롬프트 템플릿 업데이트 중 오류:', err);
      return false;
    }
  }

  /**
   * SNS 채널만 업데이트 (부분 업데이트)
   */
  async updateSNSChannels(snsChannels: UserSettings['sns_channels']): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        return false;
      }

      const userId = getBrowserUserId();

      // 먼저 레코드가 있는지 확인
      const { data: existing } = await supabase!
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // 레코드가 없으면 새로 생성
        const { error } = await supabase!
          .from('user_settings')
          .insert({
            user_id: userId,
            ai_settings: {},
            prompt_templates: {},
            sns_channels: snsChannels,
          });

        if (error) {
          console.error('SNS 채널 생성 실패:', error);
          return false;
        }
        return true;
      }

      // 레코드가 있으면 sns_channels 필드만 업데이트
      const { error } = await supabase!
        .from('user_settings')
        .update({ sns_channels: snsChannels })
        .eq('user_id', userId);

      if (error) {
        console.error('SNS 채널 업데이트 실패:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('SNS 채널 업데이트 중 오류:', err);
      return false;
    }
  }

  /**
   * 기본 설정 생성
   */
  private createDefaultSettings(): UserSettings {
    return {
      user_id: getBrowserUserId(),
      ai_settings: {},
      prompt_templates: {},
      sns_channels: [],
    };
  }

  /**
   * Threads 토큰 저장/업데이트
   */
  async updateThreadsTokens(tokens: {
    access_token: string;
    user_id: string;
    expires_in?: number;
    timestamp?: number;
  } | null): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        return false;
      }

      const userId = getBrowserUserId();

      // 먼저 레코드가 있는지 확인
      const { data: existing } = await supabase!
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // 레코드가 없으면 새로 생성
        const { error } = await supabase!
          .from('user_settings')
          .insert({
            user_id: userId,
            ai_settings: {},
            prompt_templates: {},
            sns_channels: [],
            threads_tokens: tokens,
          });

        if (error) {
          console.error('Threads 토큰 생성 실패:', error);
          return false;
        }
        return true;
      }

      // 레코드가 있으면 threads_tokens 필드만 업데이트
      const { error } = await supabase!
        .from('user_settings')
        .update({ threads_tokens: tokens })
        .eq('user_id', userId);

      if (error) {
        console.error('Threads 토큰 업데이트 실패:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Threads 토큰 업데이트 중 오류:', err);
      return false;
    }
  }

  /**
   * Threads 토큰 가져오기
   */
  async getThreadsTokens(): Promise<{
    access_token: string;
    user_id: string;
    expires_in?: number;
    timestamp?: number;
  } | null> {
    try {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const userId = getBrowserUserId();

      const { data, error } = await supabase!
        .from('user_settings')
        .select('threads_tokens')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Threads 토큰 조회 실패:', error);
        return null;
      }

      return data?.threads_tokens || null;
    } catch (err) {
      console.error('Threads 토큰 조회 중 오류:', err);
      return null;
    }
  }

  /**
   * localStorage와 Supabase 동기화
   */
  async syncFromLocalStorage(localData: {
    aiProvider?: string;
    apiKeys?: Record<string, string>;
    promptTemplates?: Record<string, string>;
    snsChannels?: Array<any>;
  }): Promise<boolean> {
    try {
      const settings: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
        ai_settings: {
          provider: localData.aiProvider as any,
          geminiApiKey: localData.apiKeys?.gemini,
          openaiApiKey: localData.apiKeys?.openai,
          anthropicApiKey: localData.apiKeys?.anthropic,
        },
        prompt_templates: {
          topic: localData.promptTemplates?.topic,
          field: localData.promptTemplates?.field,
          blogPost: localData.promptTemplates?.blogPost,
          midjourneyPrompt: localData.promptTemplates?.midjourneyPrompt,
          imagenPrompt: localData.promptTemplates?.imagenPrompt,
        },
        sns_channels: localData.snsChannels || [],
      };

      const result = await this.saveSettings(settings);
      return result !== null;
    } catch (err) {
      console.error('localStorage 동기화 중 오류:', err);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const settingsService = new SettingsService();
