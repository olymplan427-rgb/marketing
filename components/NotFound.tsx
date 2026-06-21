import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-chalk px-4">
      <div className="max-w-2xl w-full bg-chalk rounded-card border border-hairline p-8 md:p-12 text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-mist">
            <svg
              className="w-16 h-16 text-graphite"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl font-bold text-graphite mb-4">
          404
        </h1>

        <h2 className="text-3xl font-bold text-graphite mb-4">
          페이지를 찾을 수 없습니다
        </h2>

        <p className="text-lg text-concrete mb-8 max-w-md mx-auto">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          주소를 다시 확인해주세요.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-chalk bg-graphite rounded-lg hover:bg-carbon transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>홈으로 돌아가기</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-graphite border border-hairline bg-chalk rounded-lg hover:bg-mist transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>이전 페이지로</span>
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-hairline">
          <p className="text-sm text-concrete mb-4">
            또는 아래 페이지로 이동하세요:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/instagram"
              className="px-4 py-2 text-sm font-medium text-concrete hover:text-graphite hover:bg-mist rounded-lg transition-colors"
            >
              인스타그램 포스트
            </Link>
            <Link
              to="/threads"
              className="px-4 py-2 text-sm font-medium text-concrete hover:text-graphite hover:bg-mist rounded-lg transition-colors"
            >
              쓰레드 포스트
            </Link>
            <Link
              to="/history"
              className="px-4 py-2 text-sm font-medium text-concrete hover:text-graphite hover:bg-mist rounded-lg transition-colors"
            >
              컨텐츠 히스토리
            </Link>
            <Link
              to="/settings/ai"
              className="px-4 py-2 text-sm font-medium text-concrete hover:text-graphite hover:bg-mist rounded-lg transition-colors"
            >
              AI 설정
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
