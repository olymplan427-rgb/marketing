import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PromptReviewModal from './components/PromptReviewModal';
import Sidebar, { MenuItem } from './components/Sidebar';
import ThreadsAuthCallback from './components/ThreadsAuthCallback';
import DeletionStatus from './components/DeletionStatus';
import AuthPage from './components/AuthPage';
import NotFound from './components/NotFound';
import AppRouter from './components/AppRouter';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { AISettingsProvider, useAISettingsContext } from './contexts/AISettingsContext';
import { useUserCategories } from './hooks/useUserCategories';
import { useBlogGeneration } from './hooks/useBlogGeneration';
import { DEFAULT_PROMPT_TEMPLATES } from './constants';
import { isSupabaseConfigured } from './lib/supabase';

// URL 경로를 MenuItem으로 변환하는 매핑
const pathToMenuItem: Record<string, MenuItem> = {
  '/': 'blog-assistant',
  '/instagram': 'insta-content',
  '/threads': 'threads-auto-posting',
  '/history': 'content-history',
  '/settings/ai': 'ai-settings',
  '/settings/prompt': 'prompt-settings',
  '/settings/sns': 'sns-management',
  '/settings/dark-mode': 'dark-mode',
};

// 페이지별 타이틀 매핑
const pageTitles: Record<string, string> = {
  '/': 'AI Contents Studio - 블로그 포스트',
  '/instagram': 'AI Contents Studio - 인스타그램 포스트',
  '/threads': 'AI Contents Studio - 쓰레드 포스트',
  '/history': 'AI Contents Studio - 컨텐츠 히스토리',
  '/settings/ai': 'AI Contents Studio - AI 설정',
  '/settings/prompt': 'AI Contents Studio - 프롬프트 설정',
  '/settings/sns': 'AI Contents Studio - SNS 관리',
  '/settings/dark-mode': 'AI Contents Studio - 다크모드 설정',
  '/auth/threads/callback': 'AI Contents Studio - Threads 인증',
  '/deletion-status': 'AI Contents Studio - 데이터 삭제',
};

const AppContent: React.FC = () => {
  // React Router hooks
  const location = useLocation();
  const navigate = useNavigate();

  // Auth state from context
  const { user: currentUser, isLoading: isAuthLoading } = useAuthContext();

  // Menu state
  const [activeMenu, setActiveMenu] = useState<MenuItem>('blog-assistant');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // AI Settings from context
  const {
    apiKeys,
    setApiKeys,
    activeProvider,
    setActiveProvider,
    selectedSubModels,
    setSelectedSubModels,
    promptTemplates,
    setPromptTemplates,
    isInitialLoadComplete,
  } = useAISettingsContext();

  // Blog generation hook - ALWAYS call hooks, never conditionally
  const {
    formState,
    setFormState,
    files,
    blogPost,
    setBlogPost,
    blogSources,
    generatedImages,
    isLoading,
    error,
    topicSuggestions,
    keywordSuggestions,
    audienceSuggestions,
    isPromptModalOpen,
    setIsPromptModalOpen,
    finalPrompt,
    handleInputChange,
    handleFileChange,
    resetFiles,
    removeFile,
    handleGenerateTopics,
    handleGenerateFieldSuggestions,
    handleReviewPrompt,
    handleConfirmGeneration,
    handleSaveBlogPost,
    handleRestoreBlogPost: handleRestoreBlogPostFromHook,
    handleGenerateImage,
  } = useBlogGeneration(promptTemplates, activeProvider);

  // User categories management (depends on formState from useBlogGeneration)
  const {
    userCategories,
    newCategoryInput,
    setNewCategoryInput,
    handleAddCategory,
    handleRemoveCategory,
  } = useUserCategories(formState, setFormState);

  // URL 경로 기반으로 activeMenu 동기화
  useEffect(() => {
    const menuFromPath = pathToMenuItem[location.pathname];
    if (menuFromPath && menuFromPath !== activeMenu) {
      setActiveMenu(menuFromPath);
    }
  }, [location.pathname]);

  // 페이지 타이틀 동적 변경
  useEffect(() => {
    const title = pageTitles[location.pathname] || 'AI Contents Studio';
    document.title = title;
  }, [location.pathname]);

  // Wrapper for handleRestoreBlogPost to switch menu
  const handleRestoreBlogPost = (content: any) => {
    handleRestoreBlogPostFromHook(content);
    navigate('/'); // URL을 블로그 포스트 페이지로 변경
    alert('블로그 포스트가 에디터로 불러와졌습니다!');
  };

  // AI 설정 로딩 중 (모든 훅 호출 후 체크)
  if (!isInitialLoadComplete) {
    return (
      <div className="flex items-center justify-center h-screen bg-chalk">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-graphite mx-auto mb-4"></div>
          <p className="text-concrete">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 인증 로딩 중
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-chalk">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-graphite mx-auto mb-4"></div>
          <p className="text-concrete">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Supabase가 설정되어 있고 로그인하지 않은 경우
  if (isSupabaseConfigured() && !currentUser) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  // Threads OAuth 콜백 처리
  if (window.location.pathname === '/auth/threads/callback') {
    return <ThreadsAuthCallback onAuthSuccess={() => {
      // 콜백 성공 시 Threads 포스트 페이지로 이동
      // 실제 리다이렉트는 ThreadsAuthCallback 컴포넌트 내에서 처리됨
    }} />;
  }

  // 데이터 삭제 상태 페이지
  if (window.location.pathname === '/deletion-status') {
    return <DeletionStatus />;
  }

  // 404 페이지 - 알 수 없는 경로
  const isValidPath = pathToMenuItem[location.pathname] ||
                      location.pathname === '/auth/threads/callback' ||
                      location.pathname === '/deletion-status';

  if (!isValidPath) {
    return <NotFound />;
  }

  return (
    <div className="flex h-screen bg-chalk">
      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area - Handled by AppRouter */}
      <AppRouter
        activeMenu={activeMenu}
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
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        setActiveProvider={setActiveProvider}
        selectedSubModels={selectedSubModels}
        setSelectedSubModels={setSelectedSubModels}
        promptTemplates={promptTemplates}
        setPromptTemplates={setPromptTemplates}
        onResetPromptTemplates={() => setPromptTemplates(DEFAULT_PROMPT_TEMPLATES)}
        handleRestoreBlogPost={handleRestoreBlogPost}
      />

      {/* Modals */}
      <PromptReviewModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onConfirm={handleConfirmGeneration}
        prompt={finalPrompt}
        isLoading={isLoading.post}
      />
    </div>
  );
};

/**
 * App - 최상위 컴포넌트
 * AuthProvider와 AISettingsProvider로 전체 앱을 감싸서
 * 인증 상태와 AI 설정을 전역에서 사용 가능하게 합니다.
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AISettingsProvider>
        <AppContent />
      </AISettingsProvider>
    </AuthProvider>
  );
};

export default App;
