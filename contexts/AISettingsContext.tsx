import React, { createContext, useContext, ReactNode } from 'react';
import { useAISettings } from '../hooks/useAISettings';
import { AIProvider } from '../constants';
import type { PromptTemplates } from '../types';

/**
 * AISettingsContext - AI 설정 상태를 전역에서 관리하는 Context
 */
interface AISettingsContextType {
  apiKeys: Record<AIProvider, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<AIProvider, string>>>;
  activeProvider: AIProvider;
  setActiveProvider: React.Dispatch<React.SetStateAction<AIProvider>>;
  selectedSubModels: Record<AIProvider, string>;
  setSelectedSubModels: React.Dispatch<React.SetStateAction<Record<AIProvider, string>>>;
  promptTemplates: PromptTemplates;
  setPromptTemplates: React.Dispatch<React.SetStateAction<PromptTemplates>>;
  isInitialLoadComplete: boolean;
}

const AISettingsContext = createContext<AISettingsContextType | undefined>(undefined);

/**
 * AISettingsProvider - AI 설정 상태를 제공하는 Provider 컴포넌트
 */
interface AISettingsProviderProps {
  children: ReactNode;
}

export function AISettingsProvider({ children }: AISettingsProviderProps) {
  const aiSettings = useAISettings();

  return (
    <AISettingsContext.Provider value={aiSettings}>
      {children}
    </AISettingsContext.Provider>
  );
}

/**
 * useAISettingsContext - AISettingsContext를 사용하는 커스텀 훅
 *
 * 컴포넌트에서 AI 설정 상태에 접근할 때 사용합니다.
 *
 * @example
 * const { apiKeys, activeProvider, promptTemplates } = useAISettingsContext();
 *
 * // API 키 업데이트
 * setApiKeys({ ...apiKeys, gemini: 'new-api-key' });
 *
 * @returns {AISettingsContextType} AI 설정 상태 객체
 * @throws {Error} AISettingsProvider 외부에서 사용 시 에러 발생
 */
export function useAISettingsContext(): AISettingsContextType {
  const context = useContext(AISettingsContext);

  if (context === undefined) {
    throw new Error('useAISettingsContext는 AISettingsProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
}
