import React, { useState, useEffect } from 'react';
import Loader from './Loader';
import { DocumentTextIcon, ClipboardIcon, ClipboardCheckIcon, WandIcon } from './IconComponents';

interface PromptReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  prompt: string;
  isLoading: boolean;
}

const PromptReviewModal: React.FC<PromptReviewModalProps> = ({ isOpen, onClose, onConfirm, prompt, isLoading }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCopied(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  useEffect(() => {
      if (isCopied) {
          const timer = setTimeout(() => setIsCopied(false), 2000);
          return () => clearTimeout(timer);
      }
  }, [isCopied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-chalk border border-hairline rounded-card w-full max-w-2xl max-h-[90vh] flex flex-col transition-transform duration-300 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="bg-mist p-2 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-concrete"/>
            </div>
            <div>
                <h2 className="text-lg font-semibold text-graphite">최종 생성 프롬프트 검토</h2>
                <p className="text-sm text-concrete">이 프롬프트가 AI 모델로 전송됩니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-ash hover:text-concrete hover:bg-mist rounded-full">&times;</button>
        </header>

        <main className="p-6 overflow-y-auto flex-grow bg-mist">
          <pre className="whitespace-pre-wrap break-words text-sm text-graphite font-sans leading-relaxed">
            {prompt}
          </pre>
        </main>
        
        <footer className="flex justify-end items-center gap-3 p-4 bg-chalk border-t border-hairline rounded-b-card">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-graphite border border-hairline bg-chalk hover:bg-mist rounded-lg transition-colors"
          >
            {isCopied ? <ClipboardCheckIcon className="w-4 h-4 text-graphite"/> : <ClipboardIcon className="w-4 h-4"/>}
            <span>{isCopied ? '복사 완료!' : '프롬프트 복사'}</span>
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-2 text-sm font-semibold text-chalk bg-graphite rounded-lg hover:bg-carbon disabled:bg-ash disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader className="w-5 h-5" /> : <WandIcon className="w-5 h-5"/>}
            <span>이 프롬프트로 글 생성</span>
          </button>
        </footer>
      </div>
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default PromptReviewModal;
