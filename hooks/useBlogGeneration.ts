import { useState, useCallback, ChangeEvent } from 'react';
import {
  generateSeoTopics as generateSeoTopicsGemini,
  generateBlogPost as generateBlogPostGemini,
  generateFieldSuggestions as generateFieldSuggestionsGemini,
  generateMidjourneyPrompt,
  generateImagenPrompt,
  generateImageWithNanoBanana,
} from '../services/geminiService';
import {
  generateSeoTopics as generateSeoTopicsOpenAI,
  generateBlogPost as generateBlogPostOpenAI,
  generateFieldSuggestions as generateFieldSuggestionsOpenAI,
  generateImagePrompt as generateImagePromptOpenAI,
} from '../services/openaiService';
import type {
  BlogGenerationParams,
  GeneratedImage,
  BlogPostResult,
  PromptTemplates,
} from '../types';
import type { AIProvider } from '../constants';
import { isSupabaseConfigured, ContentHistory } from '../lib/supabase';
import { historyService } from '../services/historyService';

const constructPromptFromTemplate = (
  template: string,
  params: BlogGenerationParams,
  fileContents?: string
): string => {
  const { region, category, topic, keywords, targetAudience, writerInsight, wordCount } = params;

  const year = new Date().getFullYear();
  const baseWordCount = parseInt(wordCount, 10);
  const targetWordCount = isNaN(baseWordCount) ? 2000 : baseWordCount;
  const wordCountRange = `${targetWordCount}-${targetWordCount + 500}`;
  const fileContentText = fileContents ? `- 참고 자료 (첨부 파일 내용):\n${fileContents}` : '';
  const referenceUrlsSection = params.referenceUrls
    ? `- 참고 자료 (URL 목록):\n${params.referenceUrls}`
    : '';

  return template
    .replace(/\$\{region\}/g, region)
    .replace(/\$\{category\}/g, category)
    .replace(/\$\{topic\}/g, topic)
    .replace(/\$\{keywords\}/g, keywords)
    .replace(/\$\{targetAudience\}/g, targetAudience)
    .replace(/\$\{writerInsight\}/g, writerInsight)
    .replace(/\$\{wordCountRange\}/g, wordCountRange)
    .replace(/\$\{fileContents\}/g, fileContentText)
    .replace(/\$\{referenceUrlsSection\}/g, referenceUrlsSection)
    .replace(/\$\{year\}/g, String(year + 1));
};

/**
 * useBlogGeneration - 블로그 생성 워크플로우 관리 훅
 *
 * 블로그 포스트 생성과 관련된 모든 상태와 로직을 관리합니다:
 * - 폼 상태 관리
 * - AI 생성 (주제 제안, 필드 제안, 블로그 포스트)
 * - 이미지 생성 (Midjourney + Gemini)
 * - 저장/복원 기능
 */
export function useBlogGeneration(
  promptTemplates: PromptTemplates,
  activeProvider: AIProvider
) {
  // Form state
  const [formState, setFormState] = useState<BlogGenerationParams>({
    region: '한국',
    category: '',
    topic: '',
    keywords: '',
    targetAudience: '',
    writerInsight: '',
    wordCount: '2000',
    referenceUrls: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  // Generated content state
  const [blogPost, setBlogPost] = useState('');
  const [blogSources, setBlogSources] = useState<{ uri: string; title: string }[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    topics: false,
    post: false,
    fieldSuggestions: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [audienceSuggestions, setAudienceSuggestions] = useState<string[]>([]);

  // Prompt modal state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [finalPrompt, setFinalPrompt] = useState('');

  // Helper: Run AI action with loading state
  const runAIAction = async (action: string, fn: () => Promise<void>) => {
    try {
      setIsLoading((prev) => ({ ...prev, [action]: true }));
      setError(null);
      await fn();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error(`AI 작업 오류 (${action}):`, err);
    } finally {
      setIsLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  // Helper: Read files as text
  const readFilesAsText = async (filesToRead: File[]): Promise<string> => {
    const readers = filesToRead.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(`--- Start of ${file.name} ---\n${reader.result}\n--- End of ${file.name} ---\n\n`);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        })
    );

    try {
      const contents = await Promise.all(readers);
      return contents.join('');
    } catch (error) {
      throw new Error('파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  // Helper: Parse image prompts from markdown
  const parseImagePrompts = (markdown: string): string[] => {
    const regex = /\[IMAGE_PROMPT:\s*(.*?)\]/gs;
    const matches = markdown.match(regex);
    if (!matches) {
      console.log('No IMAGE_PROMPT patterns found in markdown');
      return [];
    }
    const prompts = matches
      .map((match) => {
        const prompt = match.replace(/\[IMAGE_PROMPT:\s*|\]/g, '').trim();
        console.log('Parsed image prompt:', prompt);
        return prompt;
      })
      .filter((prompt) => prompt.length > 0);
    console.log(`Found ${prompts.length} image prompts`);
    return prompts;
  };

  // Helper: 이미지 프롬프트(영문)만 생성 - 이미지는 자동 생성하지 않음
  const generateMidjourneyPromptsFromImagePrompts = (prompts: string[]) => {
    console.log(`이미지 프롬프트 생성 시작: ${prompts.length}개`);
    const initialImages: GeneratedImage[] = prompts.map((prompt) => ({
      prompt,
      imageUrl: null,
      midjourneyPrompt: undefined,
      geminiImageUrl: undefined,
    }));
    setGeneratedImages(initialImages);

    prompts.forEach((prompt, index) => {
      const generatePromptFn = activeProvider === 'openai'
        ? () => generateImagePromptOpenAI(prompt, promptTemplates.imagenPrompt)
        : () => generateImagenPrompt(prompt, promptTemplates.imagenPrompt);

      setTimeout(() => {
        generatePromptFn()
          .then((englishPrompt) => {
            console.log(`프롬프트 생성 완료 ${index + 1}:`, englishPrompt);
            setGeneratedImages((prev) => {
              const newImages = [...prev];
              newImages[index] = {
                ...newImages[index],
                midjourneyPrompt: englishPrompt,
                imageUrl: 'prompt-generated',
                geminiImageUrl: undefined, // 아직 생성 안 됨 - 버튼 클릭 대기
              };
              return newImages;
            });
          })
          .catch((error) => {
            console.error(`프롬프트 생성 실패 ${index + 1}:`, error);
            setGeneratedImages((prev) => {
              const newImages = [...prev];
              newImages[index] = {
                ...newImages[index],
                imageUrl: 'error',
                error: error.message || '이미지 생성 프롬프트 생성에 실패했습니다.',
              };
              return newImages;
            });
          });
      }, index * 500);
    });
  };

  // 나노바나나로 이미지 생성 (사용자가 버튼 클릭 시 호출)
  const handleGenerateImage = async (index: number, prompt: string) => {
    setGeneratedImages((prev) => {
      const newImages = [...prev];
      newImages[index] = { ...newImages[index], geminiImageUrl: null, geminiImageError: undefined };
      return newImages;
    });

    try {
      const result = await generateImageWithNanoBanana(prompt);
      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[index] = { ...newImages[index], geminiImageUrl: result.imageUrl };
        return newImages;
      });
    } catch (err: any) {
      setGeneratedImages((prev) => {
        const newImages = [...prev];
        newImages[index] = {
          ...newImages[index],
          geminiImageUrl: 'error',
          geminiImageError: err.message || '나노바나나 이미지 생성 실패',
        };
        return newImages;
      });
    }
  };

  // Event handlers
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).slice(0, 5));
    }
  };

  const resetFiles = () => {
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateTopics = () => {
    const referenceUrlsSection = formState.referenceUrls
      ? `\n\n아래 URL들의 내용을 핵심적으로 참고하여, 가장 최신 정보를 반영한 주제를 제안해줘:\n${formState.referenceUrls}`
      : '';

    const prompt = promptTemplates.topicSuggestion
      .replace(/\$\{region\}/g, formState.region)
      .replace(/\$\{category\}/g, formState.category)
      .replace(/\$\{referenceUrlsSection\}/g, referenceUrlsSection);

    const generateFn = activeProvider === 'openai' ? generateSeoTopicsOpenAI : generateSeoTopicsGemini;
    runAIAction('topics', () => generateFn(prompt).then(setTopicSuggestions));
  };

  const handleGenerateFieldSuggestions = () => {
    if (!formState.topic) {
      setError('먼저 글 주제를 입력해주세요.');
      return;
    }
    const prompt = promptTemplates.fieldSuggestion.replace(/\$\{topic\}/g, formState.topic);
    const generateFn = activeProvider === 'openai' ? generateFieldSuggestionsOpenAI : generateFieldSuggestionsGemini;
    runAIAction('fieldSuggestions', () =>
      generateFn(prompt).then((suggestions) => {
        const keywordsString = suggestions.keywords.join(', ');
        setFormState((prev) => ({
          ...prev,
          keywords: keywordsString,
          targetAudience: suggestions.targetAudience[0] || '',
          writerInsight: suggestions.writerInsight,
        }));
        setKeywordSuggestions(suggestions.keywords);
        setAudienceSuggestions(suggestions.targetAudience);
      })
    );
  };

  const handleReviewPrompt = async () => {
    if (!formState.topic) {
      setError('글 주제를 입력해주세요.');
      return;
    }
    setError(null);

    let fileContents: string | undefined;
    if (files.length > 0) {
      try {
        fileContents = await readFilesAsText(files);
      } catch (e) {
        setError('파일을 읽는 중 오류가 발생했습니다.');
        return;
      }
    }

    const prompt = constructPromptFromTemplate(promptTemplates.blogPost, formState, fileContents);
    setFinalPrompt(prompt);
    setIsPromptModalOpen(true);
  };

  const handleConfirmGeneration = () => {
    setIsPromptModalOpen(false);
    setBlogPost('');
    setBlogSources([]);
    setGeneratedImages([]);
    const useSearch = !!formState.referenceUrls && formState.referenceUrls.trim().length > 0;
    const generateFn = activeProvider === 'openai' ? generateBlogPostOpenAI : generateBlogPostGemini;
    runAIAction('post', () =>
      generateFn(finalPrompt, useSearch).then((result: BlogPostResult) => {
        setBlogPost(result.text);
        if (result.sources) {
          setBlogSources(result.sources);
        }
        setError(null);
        const imagePrompts = parseImagePrompts(result.text);
        if (imagePrompts.length > 0) {
          generateMidjourneyPromptsFromImagePrompts(imagePrompts);
        }
      })
    );
  };

  const handleSaveBlogPost = async () => {
    if (!blogPost) {
      alert('저장할 블로그 포스트가 없습니다.');
      return;
    }

    if (!isSupabaseConfigured()) {
      alert('컨텐츠를 저장하려면 Supabase 설정이 필요합니다. .env 파일을 확인해주세요.');
      return;
    }

    try {
      const title = formState.topic || '제목 없음';

      const saved = await historyService.saveContent({
        content_type: 'blog',
        title: title,
        content: blogPost,
        metadata: {
          region: formState.region,
          category: formState.category,
          keywords: formState.keywords,
          targetAudience: formState.targetAudience,
          wordCount: formState.wordCount,
        },
        images: generatedImages.map((img) => ({
          prompt: img.prompt,
          imageUrl: img.imageUrl,
          midjourneyPrompt: img.midjourneyPrompt,
          geminiImageUrl: img.geminiImageUrl,
        })),
        sources: blogSources.length > 0 ? blogSources : undefined,
      });

      if (saved) {
        alert('블로그 포스트가 성공적으로 저장되었습니다!');
      } else {
        alert('저장에 실패했습니다. 콘솔을 확인해주세요.');
      }
    } catch (error) {
      console.error('블로그 포스트 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleRestoreBlogPost = (content: ContentHistory) => {
    // Restore blog post content
    setBlogPost(content.content);

    // Restore metadata to form state
    if (content.metadata) {
      const metadata = content.metadata;
      setFormState((prev) => ({
        ...prev,
        topic: content.title,
        region: metadata.region || prev.region,
        category: metadata.category || prev.category,
        keywords: metadata.keywords || prev.keywords,
        targetAudience: metadata.targetAudience || prev.targetAudience,
        wordCount: metadata.wordCount || prev.wordCount,
      }));
    }

    // Restore images
    if (content.images && content.images.length > 0) {
      const restoredImages: GeneratedImage[] = content.images.map((img) => ({
        prompt: img.prompt,
        imageUrl: img.imageUrl || null,
        midjourneyPrompt: img.midjourneyPrompt,
        geminiImageUrl: img.geminiImageUrl === null ? undefined : img.geminiImageUrl,
      }));
      setGeneratedImages(restoredImages);
    }

    // Restore sources
    if (content.sources) {
      setBlogSources(content.sources);
    }

    // Switch to blog assistant menu
    // Note: This will be handled in App.tsx by passing setActiveMenu
  };

  return {
    // State
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

    // Handlers
    handleInputChange,
    handleFileChange,
    resetFiles,
    removeFile,
    handleGenerateTopics,
    handleGenerateFieldSuggestions,
    handleReviewPrompt,
    handleConfirmGeneration,
    handleSaveBlogPost,
    handleRestoreBlogPost,
    handleGenerateImage,
  };
}
