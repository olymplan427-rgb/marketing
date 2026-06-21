
import React from 'react';

interface InstagramControlsProps {
    onGenerate: () => Promise<void>;
    onSave: () => Promise<void>;
    isLoading: boolean;
    isQuestionReady: boolean;
    isSaving: boolean;
}

export const InstagramControls: React.FC<InstagramControlsProps> = ({
    onGenerate,
    onSave,
    isLoading,
    isQuestionReady,
    isSaving
}) => {
    return (
        <div className="w-full flex flex-col sm:flex-row gap-4">
            <button
                onClick={onGenerate}
                disabled={isLoading || isSaving}
                className="flex-1 bg-graphite hover:bg-carbon text-chalk font-medium py-3 px-6 rounded-lg transition-colors disabled:bg-ash disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin text-lg">⏳</span>
                        <span>생성 중...</span>
                    </>
                ) : (
                    <>
                        <span>✨</span>
                        <span>새 질문 생성</span>
                    </>
                )}
            </button>

            <button
                onClick={onSave}
                disabled={!isQuestionReady || isLoading || isSaving}
                className="flex-1 border border-hairline bg-chalk hover:bg-mist text-graphite font-medium py-3 px-6 rounded-lg transition-colors disabled:bg-ash disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSaving ? (
                    <>
                        <span className="animate-spin text-lg">⏳</span>
                        <span>저장 중...</span>
                    </>
                ) : (
                    <>
                        <span>💾</span>
                        <span>저장하기</span>
                    </>
                )}
            </button>
        </div>
    );
};
