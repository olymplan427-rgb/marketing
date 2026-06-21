import React, { useState, useEffect } from 'react';
import type { PromptTemplates } from '../types';

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
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

interface PromptSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptTemplates: PromptTemplates;
  onSave: (newTemplate: PromptTemplates) => void;
  onReset: () => void;
}

type PromptKey = keyof Omit<PromptTemplates, 'categorySuggestion'>;

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
        description: '한국어 이미지 설명을 Midjourney에 최적화된 영문 프롬프트로 변환하는 프롬프트입니다.',
        variables: {
            '${koreanPrompt}': '한국어로 작성된 원본 이미지 설명'
        }
    },
    imagenPrompt: {
        name: 'Imagen AI 프롬프트 생성',
        description: '한국어 이미지 설명을 Google Imagen AI에 최적화된 영문 프롬프트로 변환하는 프롬프트입니다.',
        variables: {
            '${koreanPrompt}': '한국어로 작성된 원본 이미지 설명'
        }
    }
};

const PromptSettingsModal: React.FC<PromptSettingsModalProps> = ({ isOpen, onClose, promptTemplates, onSave, onReset }) => {
    const [localTemplates, setLocalTemplates] = useState<PromptTemplates>(promptTemplates);
    const [selectedPrompt, setSelectedPrompt] = useState<PromptKey>('topicSuggestion');

    useEffect(() => {
        if (isOpen) {
            setLocalTemplates(promptTemplates);
            setSelectedPrompt('topicSuggestion');
        }
    }, [isOpen, promptTemplates]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    const handleSave = () => {
        onSave(localTemplates);
        onClose();
    };

    const handleResetAll = () => {
        if (window.confirm('모든 프롬프트를 기본값으로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            onReset();
            onClose();
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalTemplates(prev => ({
            ...prev,
            [selectedPrompt]: e.target.value
        }));
    };
    
    if (!isOpen) return null;

    const currentConfig = PROMPT_CONFIG[selectedPrompt];
    const promptKeys = Object.keys(PROMPT_CONFIG) as PromptKey[];
    
    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col transform transition-transform duration-300 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800">프롬프트 관리</h2>
                        <p className="text-sm text-slate-500 mt-1">AI 글 생성 과정의 각 단계에서 사용되는 프롬프트를 수정합니다.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                
                <main className="flex-grow flex min-h-0">
                    <aside className="w-1/4 p-4 border-r border-slate-200 flex flex-col justify-between">
                        <div className="space-y-2">
                           {promptKeys.map((key) => {
                                const config = PROMPT_CONFIG[key as PromptKey];
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPrompt(key as PromptKey)}
                                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            selectedPrompt === key
                                                ? 'bg-indigo-100 text-indigo-700'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {config.name}
                                    </button>
                                );
                           })}
                        </div>
                        <button 
                            onClick={handleResetAll}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200/80"
                        >
                            <RefreshCwIcon className="w-4 h-4" />
                            <span>모두 기본값으로 초기화</span>
                        </button>
                    </aside>
                    
                    <section className="w-3/4 flex flex-col">
                        <div className="p-6 border-b border-slate-200">
                             <h3 className="text-lg font-semibold text-slate-800">{currentConfig.name}</h3>
                             <p className="text-sm text-slate-500 mt-1">{currentConfig.description}</p>
                        </div>
                        <div className="flex-grow flex min-h-0">
                            <div className="w-2/3 p-2">
                                <textarea
                                    value={localTemplates[selectedPrompt]}
                                    onChange={handleTemplateChange}
                                    className="w-full h-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs leading-relaxed"
                                />
                            </div>
                            <div className="w-1/3 p-4 border-l border-slate-200 overflow-y-auto bg-slate-50/50">
                                <h4 className="text-base font-semibold text-slate-700 mb-3">사용 가능한 변수</h4>
                                <ul className="space-y-3">
                                    {Object.entries(currentConfig.variables).map(([variable, description]) => (
                                        <li key={variable}>
                                            <code className="text-xs font-bold bg-indigo-100 text-indigo-800 rounded px-1.5 py-0.5">{variable}</code>
                                            <p className="text-xs text-slate-500 mt-1">{description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="flex justify-end items-center gap-3 p-4 bg-white border-t border-slate-200 rounded-b-xl flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                        <CheckIcon className="w-4 h-4" />
                        <span>변경사항 저장</span>
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default PromptSettingsModal;