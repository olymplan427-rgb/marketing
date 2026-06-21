import React, { Suspense } from 'react';
import Header from './Header';
import PageLoader from './PageLoader';
import MainBlogAssistant from './MainBlogAssistant';
import SNSManagement from './SNSManagement';
import DarkModeSettings from './DarkModeSettings';
import type { MenuItem } from './Sidebar';
import type { BlogGenerationParams, GeneratedImage } from '../types';
import type { AIProvider } from '../constants';
import type { PromptTemplates } from '../types';
import type { ContentHistory } from '../lib/supabase';

// Lazy-loaded page components
const AISettingsPage = React.lazy(() => import('./AISettingsPage'));
const PromptSettingsPage = React.lazy(() => import('./PromptSettingsPage'));
const ContentHistoryPage = React.lazy(() => import('./ContentHistoryPage'));
const InstagramPostGenerator = React.lazy(() => import('./InstagramPostGenerator'));
const InstagramTextPoolManager = React.lazy(() => import('./InstagramTextPoolManager'));
const InstagramPostHistory = React.lazy(() => import('./InstagramPostHistory'));
const ThreadsAutoPosting = React.lazy(() => import('./ThreadsAutoPosting'));

// Header configurations for each menu
const headerConfig: Record<MenuItem, { title: string; subtitle: string; iconType: string }> = {
  'blog-assistant': {
    title: '블로그 포스트',
    subtitle: '다양한 AI 모델로 SEO에 최적화된 블로그 글을 손쉽게 작성하세요',
    iconType: 'tistory',
  },
  'insta-content': {
    title: '인스타그램 포스트',
    subtitle: '인스타그램 콘텐츠를 AI로 쉽게 생성하세요',
    iconType: 'instagram',
  },
  'insta-text-pool': {
    title: '텍스트 풀 관리',
    subtitle: '인스타그램 포스트에 사용할 질문 텍스트를 관리하세요',
    iconType: 'instagram',
  },
  'insta-history': {
    title: '인스타그램 포스트 히스토리',
    subtitle: '생성된 인스타그램 포스트를 관리하고 확인하세요',
    iconType: 'instagram',
  },
  'threads-auto-posting': {
    title: '쓰레드 포스트',
    subtitle: 'AI를 활용하여 쓰레드 콘텐츠를 자동으로 생성하고 관리하세요',
    iconType: 'threads',
  },
  'content-history': {
    title: '컨텐츠 히스토리',
    subtitle: '생성된 모든 컨텐츠를 저장하고 관리하세요',
    iconType: 'content-history',
  },
  'ai-settings': {
    title: 'AI 설정',
    subtitle: '사용할 AI 모델을 선택하고 API 키를 설정하세요',
    iconType: 'ai-settings',
  },
  'prompt-settings': {
    title: '프롬프트 설정',
    subtitle: 'AI 프롬프트를 커스터마이징하여 원하는 결과를 얻으세요',
    iconType: 'prompt-settings',
  },
  'sns-management': {
    title: 'SNS 관리',
    subtitle: 'SNS 계정 및 설정을 관리하세요',
    iconType: 'sns-settings',
  },
  'dark-mode': {
    title: '다크 모드 설정',
    subtitle: '화면 테마를 변경하세요',
    iconType: 'dark-mode',
  },
};

interface AppRouterProps {
  activeMenu: MenuItem;

  // Blog Assistant props
  formState: BlogGenerationParams;
  files: File[];
  blogPost: string;
  blogSources: { uri: string; title: string }[];
  generatedImages: GeneratedImage[];
  isLoading: Record<string, boolean>;
  error: string | null;
  userCategories: string[];
  newCategoryInput: string;
  topicSuggestions: string[];
  keywordSuggestions: string[];
  audienceSuggestions: string[];
  activeProvider: AIProvider;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  resetFiles: () => void;
  removeFile: (index: number) => void;
  setFormState: React.Dispatch<React.SetStateAction<BlogGenerationParams>>;
  setNewCategoryInput: React.Dispatch<React.SetStateAction<string>>;
  setBlogPost: React.Dispatch<React.SetStateAction<string>>;
  handleAddCategory: () => void;
  handleRemoveCategory: (category: string) => void;
  handleGenerateTopics: () => void | Promise<void>;
  handleGenerateFieldSuggestions: () => void | Promise<void>;
  handleReviewPrompt: () => void;
  handleSaveBlogPost: () => void | Promise<void>;
  handleGenerateImage: (index: number, prompt: string) => void;

  // AI Settings props
  apiKeys: Record<AIProvider, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<AIProvider, string>>>;
  setActiveProvider: React.Dispatch<React.SetStateAction<AIProvider>>;
  selectedSubModels: Record<AIProvider, string>;
  setSelectedSubModels: React.Dispatch<React.SetStateAction<Record<AIProvider, string>>>;

  // Prompt Settings props
  promptTemplates: PromptTemplates;
  setPromptTemplates: React.Dispatch<React.SetStateAction<PromptTemplates>>;
  onResetPromptTemplates: () => void;

  // Content History props
  handleRestoreBlogPost: (content: ContentHistory) => void;
}

const AppRouter: React.FC<AppRouterProps> = ({
  activeMenu,
  formState,
  files,
  blogPost,
  blogSources,
  generatedImages,
  isLoading,
  error,
  userCategories,
  newCategoryInput,
  topicSuggestions,
  keywordSuggestions,
  audienceSuggestions,
  activeProvider,
  handleInputChange,
  handleFileChange,
  resetFiles,
  removeFile,
  setFormState,
  setNewCategoryInput,
  setBlogPost,
  handleAddCategory,
  handleRemoveCategory,
  handleGenerateTopics,
  handleGenerateFieldSuggestions,
  handleReviewPrompt,
  handleSaveBlogPost,
  handleGenerateImage,
  apiKeys,
  setApiKeys,
  setActiveProvider,
  selectedSubModels,
  setSelectedSubModels,
  promptTemplates,
  setPromptTemplates,
  onResetPromptTemplates,
  handleRestoreBlogPost,
}) => {
  const config = headerConfig[activeMenu];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      {config && (
        <Header
          title={config.title}
          subtitle={config.subtitle}
          iconType={config.iconType}
        />
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative">
        <Suspense fallback={<PageLoader />}>
          {activeMenu === 'blog-assistant' && (
            <MainBlogAssistant
              formState={formState}
              files={files}
              blogPost={blogPost}
              blogSources={blogSources}
              generatedImages={generatedImages}
              isLoading={isLoading}
              error={error}
              userCategories={userCategories}
              newCategoryInput={newCategoryInput}
              topicSuggestions={topicSuggestions}
              keywordSuggestions={keywordSuggestions}
              audienceSuggestions={audienceSuggestions}
              activeProvider={activeProvider}
              handleInputChange={handleInputChange}
              handleFileChange={handleFileChange}
              resetFiles={resetFiles}
              removeFile={removeFile}
              setFormState={setFormState}
              setNewCategoryInput={setNewCategoryInput}
              setBlogPost={setBlogPost}
              handleAddCategory={handleAddCategory}
              handleRemoveCategory={handleRemoveCategory}
              handleGenerateTopics={handleGenerateTopics}
              handleGenerateFieldSuggestions={handleGenerateFieldSuggestions}
              handleReviewPrompt={handleReviewPrompt}
              handleSaveBlogPost={handleSaveBlogPost}
              handleGenerateImage={handleGenerateImage}
            />
          )}

          {activeMenu === 'ai-settings' && (
            <AISettingsPage
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              activeProvider={activeProvider}
              setActiveProvider={setActiveProvider}
              selectedSubModels={selectedSubModels}
              setSelectedSubModels={setSelectedSubModels}
            />
          )}

          {activeMenu === 'prompt-settings' && (
            <PromptSettingsPage
              promptTemplates={promptTemplates}
              onSave={setPromptTemplates}
              onReset={onResetPromptTemplates}
            />
          )}

          {activeMenu === 'content-history' && (
            <ContentHistoryPage onRestoreBlogPost={handleRestoreBlogPost} />
          )}

          {activeMenu === 'insta-content' && <InstagramPostGenerator />}

          {activeMenu === 'insta-text-pool' && <InstagramTextPoolManager />}

          {activeMenu === 'insta-history' && <InstagramPostHistory />}

          {activeMenu === 'threads-auto-posting' && <ThreadsAutoPosting />}

          {activeMenu === 'sns-management' && <SNSManagement />}

          {activeMenu === 'dark-mode' && <DarkModeSettings />}
        </Suspense>

        <footer className="text-center mt-16 text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} AI Blog Post Generator. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default AppRouter;
