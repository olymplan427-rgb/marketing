import React from 'react';
import Loader from './Loader';

/**
 * PageLoader - Code splitting을 위한 페이지 로딩 컴포넌트
 * React.lazy와 Suspense의 fallback으로 사용됩니다.
 */
const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <Loader className="w-12 h-12 text-blue-600" />
    <p className="text-slate-600 dark:text-slate-400 text-sm">
      페이지를 불러오는 중...
    </p>
  </div>
);

export default PageLoader;
