import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

const DarkModeSettings: React.FC = () => {
  const { isDarkMode, setDarkMode } = useDarkMode();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-chalk rounded-card p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-graphite mb-2">다크모드 설정</h2>
          <p className="text-concrete">
            화면 테마를 선택하여 눈의 피로를 줄이고 편안한 작업 환경을 만드세요.
          </p>
        </div>

        {/* 테마 선택 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 라이트 모드 */}
          <button
            onClick={() => setDarkMode(false)}
            className={`relative p-6 rounded-card border-2 transition-colors ${
              !isDarkMode
                ? 'border-graphite bg-mist'
                : 'border-hairline hover:border-concrete'
            }`}
          >
            {/* 선택 표시 */}
            {!isDarkMode && (
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-graphite" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* 라이트 모드 아이콘 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-graphite flex items-center justify-center">
                <svg className="w-10 h-10 text-chalk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-graphite mb-2">라이트 모드</h3>
              <p className="text-sm text-concrete text-center">
                밝고 깨끗한 화면으로 낮 시간대에 적합합니다
              </p>
            </div>
          </button>

          {/* 다크 모드 */}
          <button
            onClick={() => setDarkMode(true)}
            className={`relative p-6 rounded-card border-2 transition-colors ${
              isDarkMode
                ? 'border-graphite bg-mist'
                : 'border-hairline hover:border-concrete'
            }`}
          >
            {/* 선택 표시 */}
            {isDarkMode && (
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-graphite" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* 다크 모드 아이콘 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-graphite flex items-center justify-center">
                <svg className="w-10 h-10 text-chalk" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-graphite mb-2">다크 모드</h3>
              <p className="text-sm text-concrete text-center">
                어두운 화면으로 눈의 피로를 줄이고 밤 시간대에 적합합니다
              </p>
            </div>
          </button>
        </div>

        {/* 추가 정보 */}
        <div className="mt-8 p-4 bg-mist border border-hairline rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-graphite flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-graphite mb-1">테마 설정 안내</h4>
              <p className="text-sm text-concrete">
                선택한 테마는 자동으로 저장되며, 다음 방문 시에도 유지됩니다. 언제든지 변경할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarkModeSettings;
