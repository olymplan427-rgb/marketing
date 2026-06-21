import React, { useState } from 'react';
import type { GeneratedImage } from '../types';
import Loader from './Loader';
import { ClipboardIcon, ClipboardCheckIcon } from './IconComponents';

interface PromptCardProps {
    image: GeneratedImage;
    index: number;
    onGenerateImage: (index: number, prompt: string) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ image, index, onGenerateImage }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState(image.midjourneyPrompt || '');

    // midjourneyPrompt가 새로 도착하면 editedPrompt 초기화
    React.useEffect(() => {
        if (image.midjourneyPrompt && !editedPrompt) {
            setEditedPrompt(image.midjourneyPrompt);
        }
    }, [image.midjourneyPrompt]);

    const handleCopy = () => {
        if (editedPrompt) {
            navigator.clipboard.writeText(editedPrompt);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleGenerate = () => {
        if (editedPrompt.trim()) {
            onGenerateImage(index, editedPrompt.trim());
        }
    };

    const getStatusIcon = () => {
        if (image.imageUrl === null) {
            return <Loader className="w-6 h-6" />;
        } else if (image.imageUrl === 'error') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            );
        } else {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3l8-8"></path>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93 0.37 4.18 1.03"></path>
                </svg>
            );
        }
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon()}
                    <h3 className="font-semibold text-slate-800">
                        {image.imageUrl === null ? '프롬프트 생성 중...' :
                         image.imageUrl === 'error' ? '프롬프트 생성 실패' :
                         '이미지 생성 프롬프트'}
                    </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-medium">원본 설명:</span> {image.prompt}
                </p>
            </div>

            {/* Content */}
            <div className="p-4">
                {image.imageUrl === null ? (
                    <div className="flex items-center justify-center py-8 text-slate-500">
                        <div className="text-center">
                            <Loader className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">이미지 생성 프롬프트 생성 중...</p>
                        </div>
                    </div>
                ) : image.imageUrl === 'error' ? (
                    <div className="py-8 text-center">
                        <div className="text-red-500 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                        <p className="text-sm text-red-600 font-medium">프롬프트 생성 실패</p>
                        {image.error && (
                            <p className="text-xs mt-1 text-red-400">{image.error}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* 편집 가능한 프롬프트 textarea */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <span className="text-sm font-medium text-slate-700">이미지 생성 프롬프트 (수정 가능)</span>
                            </div>
                            <textarea
                                value={editedPrompt}
                                onChange={(e) => setEditedPrompt(e.target.value)}
                                rows={5}
                                className="w-full text-sm text-slate-800 leading-relaxed font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-y"
                                placeholder="프롬프트를 수정한 후 이미지 생성 버튼을 눌러주세요"
                            />
                        </div>

                        {/* 버튼 영역 */}
                        <div className="flex gap-2 mb-4">
                            {/* 나노바나나 이미지 생성 버튼 */}
                            <button
                                onClick={handleGenerate}
                                disabled={image.geminiImageUrl === null || !editedPrompt.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                            >
                                {image.geminiImageUrl === null ? (
                                    <>
                                        <Loader className="w-4 h-4" />
                                        <span>생성 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🍌</span>
                                        <span>{image.geminiImageUrl ? '다시 생성' : '나노바나나로 이미지 생성'}</span>
                                    </>
                                )}
                            </button>

                            {/* 프롬프트 복사 버튼 */}
                            <button
                                onClick={handleCopy}
                                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200"
                                title="프롬프트 복사"
                            >
                                {isCopied ? <ClipboardCheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardIcon className="w-4 h-4" />}
                                <span className="hidden sm:inline">{isCopied ? '복사됨!' : '복사'}</span>
                            </button>
                        </div>

                        {/* 나노바나나 생성 이미지 표시 */}
                        {image.geminiImageUrl && image.geminiImageUrl !== 'error' && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-base">🍌</span>
                                    <span className="text-sm font-medium text-slate-700">나노바나나 생성 이미지</span>
                                </div>
                                <div className="rounded-lg overflow-hidden border border-yellow-200 shadow-sm">
                                    <img
                                        src={image.geminiImageUrl}
                                        alt="나노바나나 생성 이미지"
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 이미지 생성 중 */}
                        {image.geminiImageUrl === null && (
                            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-3">
                                    <Loader className="w-5 h-5 text-yellow-600" />
                                    <div>
                                        <p className="text-sm font-medium text-yellow-800">🍌 나노바나나로 이미지 생성 중...</p>
                                        <p className="text-xs text-yellow-600 mt-1">잠시만 기다려주세요</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 이미지 생성 에러 */}
                        {image.geminiImageUrl === 'error' && image.geminiImageError && (
                            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-xs text-red-800">
                                    <strong>🍌 생성 실패:</strong> {image.geminiImageError}
                                </p>
                                <p className="text-xs text-red-700 mt-1">
                                    프롬프트를 수정하거나 다시 시도해보세요.
                                </p>
                            </div>
                        )}

                        {/* 안내 */}
                        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
                            💡 프롬프트를 직접 수정한 후 이미지를 생성할 수 있습니다. Google Whisk에서도 사용 가능합니다.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface GeneratedImagesDisplayProps {
    images: GeneratedImage[];
    onGenerateImage: (index: number, prompt: string) => void;
}

const GeneratedImagesDisplay: React.FC<GeneratedImagesDisplayProps> = ({ images, onGenerateImage }) => {
    if (images.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-slate-200/50 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🍌</span>
                <h2 className="text-2xl font-bold text-slate-800">이미지 생성 프롬프트</h2>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    {images.length}개
                </span>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                📝 프롬프트를 확인하고 필요하면 수정한 후, <strong>나노바나나로 이미지 생성</strong> 버튼을 눌러주세요.
            </div>

            <div className="grid grid-cols-1 gap-6">
                {images.map((image, index) => (
                    <PromptCard
                        key={index}
                        image={image}
                        index={index}
                        onGenerateImage={onGenerateImage}
                    />
                ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5 flex-shrink-0">🍌</span>
                    <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-2">🎨 나노바나나 이미지 생성 가이드</p>
                        <ul className="text-xs space-y-1.5 text-yellow-700">
                            <li>• 프롬프트는 영문 스냅사진 스타일로 최적화되어 있습니다</li>
                            <li>• 원하는 스타일로 직접 수정한 후 생성 버튼을 눌러주세요</li>
                            <li>• 생성에 실패하면 프롬프트를 수정하거나 <a href="https://labs.google/fx/tools/whisk" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:underline">Google Whisk</a>를 이용하세요</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneratedImagesDisplay;
