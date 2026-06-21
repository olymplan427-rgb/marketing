import React, { useState } from 'react';
import type { PromptTemplates } from '../types';

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const RefreshCwIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v6h6" />
        <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
        <path d="M21 22v-6h-6" />
        <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    </svg>
);

interface PromptSettingsPageProps {
    promptTemplates: PromptTemplates;
    onSave: (newTemplate: PromptTemplates) => void;
    onReset: () => void;
}

type PromptKey = keyof PromptTemplates;

const PROMPT_CONFIG: Record<PromptKey, { name: string; description: string; variables: Record<string, string> }> = {
    topicSuggestion: {
        name: '주제 추천 프롬프트',
        description: '카테고리, 지역, 참고 URL을 바탕으로 SEO에 최적화된 블로그 주제를 요청하는 프롬프트입니다.',
        variables: {
            '${region}': '선택된 지역',
            '${category}': '선택된 카테고리',
            '${referenceUrlsSection}': '참고 URL 목록 (URL이 있을 경우에만 포함됨)'
        }
    },
    fieldSuggestion: {
        name: '필드 추천 프롬프트',
        description: '글 주제에 대한 키워드, 타겟 독자, 작가 인사이트 추천을 요청하는 프롬프트입니다.',
        variables: {
            '${topic}': '입력된 글 주제'
        }
    },
    blogPost: {
        name: '블로그 글 생성 프롬프트',
        description: '모든 정보를 종합하여 최종 블로그 포스트 생성을 요청하는 메인 프롬프트입니다.',
        variables: {
            '${topic}': '글 주제',
            '${keywords}': '주요 키워드',
            '${targetAudience}': '타겟 독자',
            '${writerInsight}': '작가의 인사이트',
            '${wordCountRange}': '목표 글자 수 범위 (예: 2000-2500)',
            '${region}': '선택된 지역 (이미지 프롬프트 생성 시 참고)',
            '${fileContents}': '첨부된 파일 내용 (파일이 있을 경우)',
            '${referenceUrlsSection}': '참고 URL 목록 (URL이 있을 경우)',
            '${faqSection}': 'AI가 생성할 FAQ 질문 목록',
            '${year}': '현재 연도 + 1'
        }
    },
    midjourneyPrompt: {
        name: 'Midjourney 프롬프트 생성',
        description: '한국어 이미지 설명을 Midjourney에 최적화된 영문 프롬프트로 변환하는 프롬프트입니다. Midjourney 파라미터(--ar, --style, --v)를 포함합니다.',
        variables: {
            '${koreanPrompt}': '한국어로 작성된 원본 이미지 설명'
        }
    },
    imagenPrompt: {
        name: 'Imagen AI 프롬프트 생성',
        description: '한국어 이미지 설명을 Google Imagen AI에 최적화된 영문 프롬프트로 변환하는 프롬프트입니다. Midjourney 파라미터를 제외한 순수 설명문으로 생성됩니다.',
        variables: {
            '${koreanPrompt}': '한국어로 작성된 원본 이미지 설명'
        }
    }
};

const PromptSettingsPage: React.FC<PromptSettingsPageProps> = ({ promptTemplates, onSave, onReset }) => {
    const [localTemplates, setLocalTemplates] = useState<PromptTemplates>(promptTemplates);
    const [selectedPrompt, setSelectedPrompt] = useState<PromptKey>('topicSuggestion');
    const [showSaveNotification, setShowSaveNotification] = useState(false);

    const handleSave = () => {
        onSave(localTemplates);
        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 3000);
    };

    const handleResetAll = () => {
        if (window.confirm('모든 프롬프트를 기본값으로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            onReset();
            setLocalTemplates(promptTemplates);
            setShowSaveNotification(true);
            setTimeout(() => setShowSaveNotification(false), 3000);
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalTemplates(prev => ({
            ...prev,
            [selectedPrompt]: e.target.value
        }));
    };

    const currentConfig = PROMPT_CONFIG[selectedPrompt];
    const promptKeys = Object.keys(PROMPT_CONFIG) as PromptKey[];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-graphite mb-2">프롬프트 관리</h1>
                <p className="text-concrete">AI 글 생성 과정의 각 단계에서 사용되는 프롬프트를 수정합니다.</p>
            </div>

            {/* Success Notification */}
            {showSaveNotification && (
                <div className="mb-6 bg-mist border-l-4 border-graphite text-graphite p-4 rounded-lg animate-slideIn">
                    <p className="font-medium">✓ 변경사항이 저장되었습니다!</p>
                </div>
            )}

            <div className="grid grid-cols-12 gap-6">
                {/* Left Sidebar: Prompt Selection */}
                <div className="col-span-3">
                    <div className="bg-chalk border border-hairline rounded-card p-6 sticky top-8">
                        <h2 className="text-sm font-semibold text-concrete uppercase tracking-wide mb-4">프롬프트 선택</h2>
                        <div className="space-y-2">
                            {promptKeys.map((key) => {
                                const config = PROMPT_CONFIG[key as PromptKey];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPrompt(key as PromptKey)}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                            selectedPrompt === key
                                                ? 'bg-graphite text-chalk'
                                                : 'text-concrete bg-mist hover:bg-mist'
                                        }`}
                                    >
                                        {config.name}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleResetAll}
                            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-graphite bg-chalk hover:bg-mist rounded-lg transition-colors border border-hairline"
                        >
                            <RefreshCwIcon className="w-4 h-4" />
                            <span>모두 기본값으로 초기화</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="col-span-9">
                    <div className="bg-chalk border border-hairline rounded-card overflow-hidden">
                        {/* Prompt Header */}
                        <div className="p-6 border-b border-hairline bg-mist">
                            <h2 className="text-xl font-semibold text-graphite">{currentConfig.name}</h2>
                            <p className="text-sm text-concrete mt-1">{currentConfig.description}</p>
                        </div>

                        {/* Prompt Editor */}
                        <div className="grid grid-cols-3 divide-x divide-hairline">
                            {/* Editor Area */}
                            <div className="col-span-2 p-6">
                                <label className="block text-sm font-medium text-graphite mb-3">
                                    프롬프트 내용
                                </label>
                                <textarea
                                    value={localTemplates[selectedPrompt]}
                                    onChange={handleTemplateChange}
                                    className="w-full h-96 p-4 bg-mist border border-hairline rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-graphite font-mono text-sm leading-relaxed text-graphite placeholder-ash"
                                    placeholder="프롬프트를 입력하세요..."
                                />
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-chalk bg-graphite rounded-lg hover:bg-carbon transition-colors disabled:bg-ash disabled:cursor-not-allowed"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        변경사항 저장
                                    </button>
                                </div>
                            </div>

                            {/* Variables Reference */}
                            <div className="col-span-1 p-6 bg-mist">
                                <h3 className="text-sm font-semibold text-graphite mb-4">사용 가능한 변수</h3>
                                <div className="space-y-4">
                                    {Object.entries(currentConfig.variables).map(([variable, description]) => (
                                        <div key={variable} className="bg-chalk p-3 rounded-lg border border-hairline">
                                            <code className="text-xs font-bold bg-mist text-graphite rounded px-2 py-1 break-all">
                                                {variable}
                                            </code>
                                            <p className="text-xs text-concrete mt-2">{description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 bg-mist border border-hairline p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-graphite mb-2">💡 사용 팁</h4>
                                    <p className="text-xs text-concrete leading-relaxed">
                                        프롬프트에서 변수를 사용하려면 위의 변수명을 정확하게 입력하세요.
                                        변수는 실제 값으로 자동 치환됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateY(-10px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default PromptSettingsPage;
