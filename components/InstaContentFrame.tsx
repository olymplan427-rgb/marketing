import React, { useState } from 'react';

const InstaContentFrame: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const externalUrl = 'https://memory-drawer-content-generator.vercel.app/';

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openInNewTab = () => {
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-[calc(100vh-8rem)] relative">
      {/* Open in new tab button */}
      <div className="flex items-center justify-end mb-4 pb-4 border-b border-hairline">
        <button
          onClick={openInNewTab}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-graphite bg-chalk border border-hairline hover:bg-mist rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          새 탭에서 열기
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-chalk z-10 rounded-lg">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-hairline border-t-graphite rounded-full animate-spin"></div>
            <p className="mt-4 text-concrete font-medium">인스타그램 포스트 로딩 중...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-chalk rounded-lg z-10">
          <div className="text-center max-w-md p-8">
            <div className="w-16 h-16 bg-mist rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-graphite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-graphite mb-2">페이지를 불러올 수 없습니다</h3>
            <p className="text-concrete mb-6">인스타그램 포스트를 로드하는 중 문제가 발생했습니다.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
                className="px-4 py-2 text-sm font-medium text-chalk bg-graphite hover:bg-carbon rounded-lg transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={openInNewTab}
                className="px-4 py-2 text-sm font-medium text-graphite bg-chalk border border-hairline hover:bg-mist rounded-lg transition-colors"
              >
                새 탭에서 열기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iframe */}
      <iframe
        src={externalUrl}
        className="w-full h-full border border-hairline rounded-lg bg-chalk"
        title="인스타그램 포스트"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Info notice */}
      <div className="mt-4 p-3 bg-mist border border-hairline rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-graphite flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-graphite">
            <p className="font-medium">외부 서비스 연동</p>
            <p className="text-concrete mt-1">이 서비스는 외부 사이트에서 제공됩니다. 페이지 로딩이 느리거나 문제가 있을 경우 '새 탭에서 열기'를 이용해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstaContentFrame;
