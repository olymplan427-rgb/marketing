import React from 'react';
import type { BlogGenerationParams, GeneratedImage } from '../types';
import type { AIProvider } from '../constants';
import { ChangeEvent } from 'react';
import BlogPostDisplay from './BlogPostDisplay';
import BlogSourcesDisplay from './BlogSourcesDisplay';
import GeneratedImagesDisplay from './GeneratedImagesDisplay';
import Loader from './Loader';
import { WandIcon } from './IconComponents';
import FloatingLabelInput from './FloatingLabelInput';
import Button from './ui/Button';
import Card from './ui/Card';

interface MainBlogAssistantProps {
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
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  resetFiles: () => void;
  removeFile: (index: number) => void;
  setFormState: React.Dispatch<React.SetStateAction<BlogGenerationParams>>;
  setNewCategoryInput: React.Dispatch<React.SetStateAction<string>>;
  setBlogPost: React.Dispatch<React.SetStateAction<string>>;
  handleAddCategory: () => void;
  handleRemoveCategory: (cat: string) => void;
  handleGenerateTopics: () => void;
  handleGenerateFieldSuggestions: () => void;
  handleReviewPrompt: () => void;
  handleSaveBlogPost: () => void;
  handleGenerateImage: (index: number, prompt: string) => void;
}

const MainBlogAssistant: React.FC<MainBlogAssistantProps> = (props) => {
  const {
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
  } = props;

  const isGenerating = Object.values(isLoading).some(Boolean);

  // File upload drag & drop state
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Allowed file types
  const ALLOWED_FILE_EXTENSIONS = ['.txt', '.md', '.text'];
  const ALLOWED_MIME_TYPES = ['text/plain', 'text/markdown'];
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  // Validate file type
  const isValidFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.includes(extension);
    const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
    return hasValidExtension && hasValidMimeType;
  };

  // Validate file size
  const isValidFileSize = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles: File[] = Array.from(e.dataTransfer.files);

    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];

    droppedFiles.forEach((file: File) => {
      if (!isValidFile(file)) {
        invalidFiles.push(file.name);
      } else if (!isValidFileSize(file)) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    // Show alerts for invalid files
    if (invalidFiles.length > 0) {
      alert(`다음 파일은 지원하지 않는 형식입니다:\n${invalidFiles.join(', ')}\n\n허용되는 파일 형식: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`);
    }
    if (oversizedFiles.length > 0) {
      alert(`다음 파일은 크기가 너무 큽니다 (최대 2MB):\n${oversizedFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      const limitedFiles = validFiles.slice(0, 5);
      if (validFiles.length > 5) {
        alert('최대 5개의 파일만 업로드할 수 있습니다. 처음 5개 파일만 선택됩니다.');
      }
      const fakeEvent = {
        target: {
          files: limitedFiles
        }
      } as any;
      handleFileChange(fakeEvent);
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  // Wrap handleFileChange to add validation
  const handleFileChangeWithValidation = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles: File[] = Array.from(e.target.files);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];

    selectedFiles.forEach((file: File) => {
      if (!isValidFile(file)) {
        invalidFiles.push(file.name);
      } else if (!isValidFileSize(file)) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    // Show alerts for invalid files
    if (invalidFiles.length > 0) {
      alert(`다음 파일은 지원하지 않는 형식입니다:\n${invalidFiles.join(', ')}\n\n허용되는 파일 형식: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`);
    }
    if (oversizedFiles.length > 0) {
      alert(`다음 파일은 크기가 너무 큽니다 (최대 2MB):\n${oversizedFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      const fakeEvent = {
        target: {
          files: validFiles.slice(0, 5)
        }
      } as any;
      handleFileChange(fakeEvent);

      if (validFiles.length > 5) {
        alert('최대 5개의 파일만 업로드할 수 있습니다. 처음 5개 파일만 선택됩니다.');
      }
    }

    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <>
      {error && (
        <div className="max-w-4xl mx-auto bg-mist border-l-4 border-graphite text-graphite p-4 rounded-lg mb-6" role="alert">
          <p className="font-bold">오류 발생</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 space-y-6 relative">
          {/* Flat card — border-first (Card primitive) */}
          <Card padding="lg">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-graphite">블로그 기본 정보</h2>
                <button
                  onClick={() => {
                    setFormState({ region: '한국', category: '', topic: '', keywords: '', targetAudience: '', writerInsight: '', wordCount: '2000', referenceUrls: '' });
                    resetFiles();
                  }}
                  className="text-sm text-concrete hover:text-graphite transition-colors"
                >
                  초기화
                </button>
              </div>

              {/* AI Topic Suggestions */}
              <details className="bg-mist p-4 rounded-lg border border-hairline mb-6" open>
                <summary className="font-semibold text-graphite cursor-pointer">AI 글감 추천받기</summary>
                <div className="mt-4 space-y-4">
                  <FloatingLabelInput label="지역" name="region" value={formState.region} onChange={handleInputChange} type="select">
                    <option>한국</option>
                    <option>미국</option>
                    <option>일본</option>
                    <option>글로벌</option>
                  </FloatingLabelInput>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-graphite mb-1">카테고리 선택</label>
                    <select
                      id="category"
                      name="category"
                      value={formState.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-chalk text-graphite border border-hairline rounded-lg focus:outline-none focus:ring-1 focus:ring-graphite focus:border-graphite"
                    >
                      <option value="">카테고리 선택</option>
                      {userCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-concrete mb-2">카테고리 관리</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                          placeholder="추가할 카테고리 입력"
                          className="w-full px-3 py-2 bg-chalk text-graphite border border-hairline rounded-lg placeholder-concrete focus:outline-none focus:ring-1 focus:ring-graphite focus:border-graphite"
                        />
                        <Button variant="secondary" size="md" onClick={handleAddCategory} className="flex-shrink-0">
                          추가
                        </Button>
                      </div>
                      {userCategories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 p-2 bg-mist rounded-lg border border-hairline">
                          {userCategories.map(cat => (
                            <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-chalk text-graphite rounded-full border border-hairline hover:bg-mist transition-colors">
                              {cat}
                              <button onClick={() => handleRemoveCategory(cat)} className="text-concrete hover:text-graphite transition-colors" aria-label={`Remove ${cat} category`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <FloatingLabelInput
                    label="참고 URL (선택 사항)"
                    name="referenceUrls"
                    type="textarea"
                    value={formState.referenceUrls || ''}
                    onChange={handleInputChange}
                    placeholder={"https://blog.com/post1\nhttps://youtube.com/watch?v=123"}
                    info="주제 추천 및 글 생성의 정확도를 높이기 위해 참고할 블로그, 뉴스, 유튜브 링크 등을 한 줄에 하나씩 입력해주세요."
                  />

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleGenerateTopics}
                    disabled={isLoading.topics || !formState.category}
                  >
                    {isLoading.topics ? <Loader className="w-4 h-4" /> : <WandIcon className="w-4 h-4" />}
                    최신 SEO 트렌드 주제 추천받기
                  </Button>

                  {topicSuggestions.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium text-concrete mb-2">추천 주제:</h4>
                      <div className="flex flex-wrap gap-2">
                        {topicSuggestions.map((item) => (
                          <button
                            key={item}
                            onClick={() => setFormState(p => ({ ...p, topic: item }))}
                            className="px-4 py-2 text-xs bg-mist text-graphite rounded-full border border-hairline hover:bg-hairline transition-colors"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Main Form Fields */}
              <div className="space-y-6">
                <div>
                  <FloatingLabelInput
                    label="글 주제"
                    name="topic"
                    value={formState.topic}
                    onChange={handleInputChange}
                    placeholder="예: ETF 비교, AI 글쓰기 도구"
                    required
                    info="블로그 게시물의 핵심 주제를 입력해주세요."
                  />
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onClick={handleGenerateFieldSuggestions}
                      disabled={isLoading.fieldSuggestions || !formState.topic}
                    >
                      {isLoading.fieldSuggestions ? <Loader className="w-4 h-4" /> : <WandIcon className="w-4 h-4" />}
                      AI Generation
                    </Button>
                  </div>
                </div>

                <div>
                  <FloatingLabelInput
                    label="주요 키워드 및 태그 (3~5개 이상)"
                    name="keywords"
                    value={formState.keywords}
                    onChange={handleInputChange}
                    placeholder="예: #챗GPT글쓰기, #ETF수익률"
                    required
                    info="쉼표(,)로 구분하여 키워드를 입력해주세요."
                  />
                  {keywordSuggestions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {keywordSuggestions.map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            const currentKeywords = new Set(formState.keywords.split(',').map(k => k.trim()).filter(Boolean));
                            if (!currentKeywords.has(item)) {
                              setFormState(p => ({ ...p, keywords: [...currentKeywords, item].join(', ') }))
                            }
                          }}
                          className="px-4 py-2 text-xs bg-mist text-graphite rounded-full border border-hairline hover:bg-hairline transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <FloatingLabelInput
                    label="타겟 독자"
                    name="targetAudience"
                    value={formState.targetAudience}
                    onChange={handleInputChange}
                    placeholder="예: 직장인, 블로그 초보자, 2030 투자자"
                    required
                    info="이 글을 읽을 주요 독자층을 설명해주세요."
                  />
                  {audienceSuggestions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {audienceSuggestions.map((item) => (
                        <button
                          key={item}
                          onClick={() => setFormState(p => ({ ...p, targetAudience: item }))}
                          className={`px-4 py-2 text-xs rounded-full border transition-colors ${formState.targetAudience === item ? 'bg-graphite text-chalk border-graphite' : 'bg-mist text-graphite border-hairline hover:bg-hairline'}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <FloatingLabelInput
                  label="필자의 실제 인사이트 (1~2문단)"
                  name="writerInsight"
                  value={formState.writerInsight}
                  onChange={handleInputChange}
                  type="textarea"
                  placeholder="예: 직접 사용해보니 A 도구는 초보자에게 더 적합했습니다..."
                  info="주제에 대한 필자만의 경험이나 독특한 관점을 작성해주세요."
                />

                <FloatingLabelInput
                  label="총 글자 수 목표 (선택 사항)"
                  name="wordCount"
                  value={formState.wordCount}
                  onChange={handleInputChange}
                  placeholder="예: 2000"
                  info="생성될 블로그 게시물의 목표 글자 수(한국어 기준)를 입력합니다."
                />

                <div>
                  <label className="block text-sm font-medium text-graphite mb-1">참고 파일 첨부 (선택 사항)</label>
                  <div
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-graphite bg-mist'
                        : 'border-hairline hover:border-concrete'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadAreaClick}
                  >
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-concrete" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-concrete">
                        <span className="relative font-medium text-graphite underline hover:text-concrete">
                          파일 선택
                        </span>
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={handleFileChangeWithValidation}
                          accept=".txt,.md,.text"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="pl-1">또는 파일을 끌어다 놓으세요</p>
                      </div>
                      <p className="text-xs text-concrete">
                        허용 파일: .txt, .md | 최대 5개, 각 2MB 이하
                      </p>
                    </div>
                  </div>

                  {/* Uploaded files list */}
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-concrete">
                          선택된 파일 ({files.length}/5)
                        </p>
                        <button
                          type="button"
                          onClick={resetFiles}
                          className="text-xs text-concrete hover:text-graphite font-medium"
                        >
                          전체 삭제
                        </button>
                      </div>
                      <div className="space-y-1">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 bg-mist rounded-lg border border-hairline"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 text-concrete flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-graphite truncate">{file.name}</p>
                                <p className="text-xs text-concrete">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                              className="ml-2 p-1 text-concrete hover:text-graphite hover:bg-mist rounded transition-colors"
                              aria-label={`${file.name} 삭제`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="xl"
                  fullWidth
                  onClick={handleReviewPrompt}
                  disabled={isGenerating || !formState.topic}
                >
                  {isLoading.post && <Loader className="w-6 h-6" />}
                  <span>프롬프트 검토 및 AI 글 생성</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Display */}
        <div className="lg:col-span-1 lg:sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-8">
          <BlogPostDisplay postContent={blogPost} isLoading={isLoading.post} onPostChange={setBlogPost} onSave={handleSaveBlogPost} />
          <BlogSourcesDisplay sources={blogSources} />
          <GeneratedImagesDisplay images={generatedImages} onGenerateImage={handleGenerateImage} />
        </div>
      </div>
    </>
  );
};

export default MainBlogAssistant;
