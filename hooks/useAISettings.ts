import { useState, useEffect } from 'react';
import { setApiKey as setGeminiApiKey } from '../services/geminiService';
import { setApiKey as setOpenAIApiKey, setModel as setOpenAIModel } from '../services/openaiService';
import { setApiKey as setAnthropicApiKey, setModel as setAnthropicModel } from '../services/anthropicService';
import { settingsService } from '../services/settingsService';
import { isSupabaseConfigured } from '../lib/supabase';
import type { PromptTemplates } from '../types';
import { AIProvider, DEFAULT_PROMPT_TEMPLATES } from '../constants';

/**
 * useAISettings - AI 설정 상태 관리를 위한 커스텀 훅
 *
 * API 키, 프로바이더, 프롬프트 템플릿 등을 관리하고
 * localStorage 및 Supabase와 자동 동기화합니다.
 */
export function useAISettings() {
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>(() => {
    try {
      const savedKeys = localStorage.getItem('ai_api_keys');
      const parsedKeys = savedKeys ? JSON.parse(savedKeys) : {};
      return {
        gemini: parsedKeys.gemini || '',
        openai: parsedKeys.openai || '',
        anthropic: parsedKeys.anthropic || '',
      };
    } catch {
      return { gemini: '', openai: '', anthropic: '' };
    }
  });

  const [activeProvider, setActiveProvider] = useState<AIProvider>(() => {
    const savedProvider = localStorage.getItem('ai_active_provider') as AIProvider;
    return savedProvider && ['gemini', 'openai', 'anthropic'].includes(savedProvider)
      ? savedProvider
      : 'anthropic';
  });

  const [selectedSubModels, setSelectedSubModels] = useState<Record<AIProvider, string>>(() => {
    const saved = localStorage.getItem('ai_sub_models');
    const defaults: Record<AIProvider, string> = {
      gemini: 'gemini-2.5-pro',
      openai: 'gpt-4.1',
      anthropic: 'claude-sonnet-4-6',
    };
    try {
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  const [promptTemplates, setPromptTemplates] = useState<PromptTemplates>(DEFAULT_PROMPT_TEMPLATES);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Supabase에서 설정 불러오기 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadSettingsFromSupabase = async () => {
      if (!isSupabaseConfigured()) {
        // Supabase 미설정 시 localStorage에서 불러오기
        try {
          const savedKeys = localStorage.getItem('ai_api_keys');
          if (savedKeys) setApiKeys(JSON.parse(savedKeys));

          const savedProvider = localStorage.getItem('ai_active_provider');
          if (savedProvider) setActiveProvider(savedProvider as AIProvider);

          const savedTemplates = localStorage.getItem('blog_prompt_templates');
          if (savedTemplates) {
            const parsed = JSON.parse(savedTemplates);
            setPromptTemplates({ ...DEFAULT_PROMPT_TEMPLATES, ...parsed });
          }
        } catch (err) {
          console.error('localStorage에서 설정 불러오기 실패:', err);
        }
        return;
      }

      try {
        const settings = await settingsService.getSettings();

        if (settings) {
          // AI 설정 로드
          if (settings.ai_settings) {
            const newApiKeys: Record<AIProvider, string> = {
              gemini: settings.ai_settings.geminiApiKey || '',
              openai: settings.ai_settings.openaiApiKey || '',
              anthropic: settings.ai_settings.anthropicApiKey || '',
            };
            setApiKeys(newApiKeys);

            if (settings.ai_settings.provider) {
              setActiveProvider(settings.ai_settings.provider);
            }

            // localStorage에도 캐시
            localStorage.setItem('ai_api_keys', JSON.stringify(newApiKeys));
            localStorage.setItem('ai_active_provider', settings.ai_settings.provider || 'anthropic');
          }

          // 프롬프트 템플릿 로드
          if (settings.prompt_templates) {
            const newTemplates: PromptTemplates = {
              topicSuggestion: settings.prompt_templates.topic || DEFAULT_PROMPT_TEMPLATES.topicSuggestion,
              fieldSuggestion: settings.prompt_templates.field || DEFAULT_PROMPT_TEMPLATES.fieldSuggestion,
              blogPost: settings.prompt_templates.blogPost || DEFAULT_PROMPT_TEMPLATES.blogPost,
              midjourneyPrompt: settings.prompt_templates.midjourneyPrompt || DEFAULT_PROMPT_TEMPLATES.midjourneyPrompt,
              imagenPrompt: settings.prompt_templates.imagenPrompt || DEFAULT_PROMPT_TEMPLATES.imagenPrompt,
            };
            setPromptTemplates(newTemplates);
            localStorage.setItem('blog_prompt_templates', JSON.stringify(newTemplates));
          }
        }
      } catch (err) {
        console.error('Supabase에서 설정 불러오기 실패:', err);
        // 실패 시 localStorage fallback
        try {
          const savedKeys = localStorage.getItem('ai_api_keys');
          if (savedKeys) setApiKeys(JSON.parse(savedKeys));

          const savedProvider = localStorage.getItem('ai_active_provider');
          if (savedProvider) setActiveProvider(savedProvider as AIProvider);

          const savedTemplates = localStorage.getItem('blog_prompt_templates');
          if (savedTemplates) {
            const parsed = JSON.parse(savedTemplates);
            setPromptTemplates({ ...DEFAULT_PROMPT_TEMPLATES, ...parsed });
          }
        } catch (localErr) {
          console.error('localStorage fallback 실패:', localErr);
        }
      }
    };

    loadSettingsFromSupabase().finally(() => {
      setIsInitialLoadComplete(true);
    });
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // API 키 변경 시 저장 및 서비스 동기화
  useEffect(() => {
    // 초기 로딩 중에는 저장하지 않음 (덮어쓰기 방지)
    if (!isInitialLoadComplete) return;

    localStorage.setItem('ai_api_keys', JSON.stringify(apiKeys));

    // 활성 프로바이더에 따라 API 키 설정
    if (activeProvider === 'gemini') {
      setGeminiApiKey(apiKeys.gemini);
    } else if (activeProvider === 'openai') {
      setOpenAIApiKey(apiKeys.openai);
    } else if (activeProvider === 'anthropic') {
      setAnthropicApiKey(apiKeys.anthropic);
    }

    // Supabase에도 저장
    if (isSupabaseConfigured()) {
      settingsService.updateAISettings({
        provider: activeProvider,
        geminiApiKey: apiKeys.gemini,
        openaiApiKey: apiKeys.openai,
        anthropicApiKey: apiKeys.anthropic,
      }).catch(err => console.error('Supabase AI 설정 저장 실패:', err));
    }
  }, [apiKeys, activeProvider, isInitialLoadComplete]);

  // activeProvider 변경 시 localStorage 저장
  useEffect(() => {
    localStorage.setItem('ai_active_provider', activeProvider);
  }, [activeProvider]);

  // selectedSubModels 변경 시 localStorage 저장 및 모델 설정
  useEffect(() => {
    localStorage.setItem('ai_sub_models', JSON.stringify(selectedSubModels));

    // OpenAI 모델 설정
    if (activeProvider === 'openai') {
      setOpenAIModel(selectedSubModels.openai);
    } else if (activeProvider === 'anthropic') {
      setAnthropicModel(selectedSubModels.anthropic);
    }
  }, [selectedSubModels, activeProvider]);

  // promptTemplates 변경 시 저장
  useEffect(() => {
    // 초기 로딩 중에는 저장하지 않음 (덮어쓰기 방지)
    if (!isInitialLoadComplete) return;

    localStorage.setItem('blog_prompt_templates', JSON.stringify(promptTemplates));

    // Supabase에도 저장
    if (isSupabaseConfigured()) {
      settingsService.updatePromptTemplates({
        topic: promptTemplates.topicSuggestion,
        field: promptTemplates.fieldSuggestion,
        blogPost: promptTemplates.blogPost,
        midjourneyPrompt: promptTemplates.midjourneyPrompt,
        imagenPrompt: promptTemplates.imagenPrompt,
      }).catch(err => console.error('Supabase 프롬프트 템플릿 저장 실패:', err));
    }
  }, [promptTemplates, isInitialLoadComplete]);

  return {
    apiKeys,
    setApiKeys,
    activeProvider,
    setActiveProvider,
    selectedSubModels,
    setSelectedSubModels,
    promptTemplates,
    setPromptTemplates,
    isInitialLoadComplete,
  };
}
