import React, { useState, useCallback, useEffect } from 'react';

interface BackgroundInfo {
  id?: string;
  filename: string;
  name: string;
  path: string;
  url?: string;
  size?: number;
  isDefault?: boolean;
}

interface InstagramBackgroundManagerProps {
  onBackgroundChange?: (backgroundUrl: string) => void;
  className?: string;
}

export const InstagramBackgroundManager: React.FC<InstagramBackgroundManagerProps> = ({
  onBackgroundChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<BackgroundInfo | null>(null);
  const [availableBackgrounds, setAvailableBackgrounds] = useState<BackgroundInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 배경 이미지 목록 조회 (Dropbox)
  const fetchBackgrounds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Dropbox 배경 목록 조회 중...');

      const response = await fetch('/api/list-dropbox-backgrounds');
      if (!response.ok) throw new Error(`API 오류: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const dropboxBackgrounds = result.data.backgrounds.map((bg: any) => ({
        ...bg,
        isDefault: false
      }));

      const defaultBG: BackgroundInfo = {
        filename: 'bg.png',
        name: '기본 배경',
        path: '/bg.png',
        url: '/bg.png',
        isDefault: true
      };

      const allBackgrounds = [defaultBG, ...dropboxBackgrounds];
      setAvailableBackgrounds(allBackgrounds);

      // 현재 선택된 배경 확인
      const savedUrl = localStorage.getItem('instagram-background-url');
      const current = allBackgrounds.find(bg => bg.url === savedUrl) || defaultBG;
      setCurrentBackground(current);

      if (current.url && onBackgroundChange) {
        onBackgroundChange(current.url);
      }

    } catch (err: any) {
      console.error('배경 조회 실패:', err);
      setError(err.message || '배경 목록을 불러오지 못했습니다.');
      // 실패 시 기본 배경이라도 설정
      const defaultBG: BackgroundInfo = { filename: 'bg.png', name: '기본 배경', path: '/bg.png', url: '/bg.png', isDefault: true };
      setAvailableBackgrounds([defaultBG]);
      setCurrentBackground(defaultBG);
    } finally {
      setIsLoading(false);
    }
  }, [onBackgroundChange]);

  useEffect(() => {
    if (isOpen) {
      fetchBackgrounds();
    }
  }, [isOpen, fetchBackgrounds]);

  // 배경 변경 핸들러
  const changeBackground = async (bg: BackgroundInfo) => {
    try {
      setIsLoading(true);
      setError(null);

      setCurrentBackground(bg);
      const bgUrl = bg.url || '/bg.png';

      // 로컬 스토리지 저장
      localStorage.setItem('instagram-background-url', bgUrl);

      // 부모 알림
      if (onBackgroundChange) onBackgroundChange(bgUrl);

      // Airtable 설정 업데이트
      setStatusMessage('Airtable 설정 저장 중...');
      const saveRes = await fetch('/api/save-background-setting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundUrl: bgUrl })
      });

      if (!saveRes.ok) {
        throw new Error('Airtable 저장 실패');
      }

      const saveResult = await saveRes.json();
      if (saveResult.success) {
        setStatusMessage('✅ 배경 설정이 저장되었습니다!');
      } else {
        throw new Error(saveResult.error);
      }

      setTimeout(() => setStatusMessage(null), 2000);

    } catch (err: any) {
      console.error('배경 변경 오류:', err);
      setError(err.message);
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm text-gray-300"
        disabled={isLoading && !isOpen}
      >
        🎨 배경 관리
        {isLoading && <span className="animate-spin">⏳</span>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-20 right-4 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[9999]">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">배경 이미지 관리</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>

              {error && (
                <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm break-keep">
                  {error}
                </div>
              )}

              {statusMessage && (
                <div className="bg-blue-500/20 text-blue-300 p-3 rounded mb-4 text-sm flex items-center gap-2">
                  <span>ℹ️</span> {statusMessage}
                </div>
              )}

              {/* 현재 배경 */}
              {currentBackground && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">현재 배경</h4>
                  <div className="bg-gray-700 rounded p-3 flex items-center gap-3">
                    <div className="w-12 h-8 bg-gray-600 rounded overflow-hidden">
                      <img src={currentBackground.url} alt="Current" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-white text-sm truncate">{currentBackground.name}</div>
                      <div className="text-gray-400 text-xs">{currentBackground.isDefault ? '기본값' : 'Dropbox'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 목록 */}
              <div className="mb-2">
                <h4 className="text-sm font-medium text-gray-300 mb-2">사용 가능한 배경 ({availableBackgrounds.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {availableBackgrounds.map((bg, idx) => (
                    <div
                      key={idx}
                      onClick={() => changeBackground(bg)}
                      className={`p-2 rounded cursor-pointer transition-colors flex items-center gap-2 ${currentBackground?.url === bg.url ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                      <div className="w-10 h-10 bg-gray-600 rounded flex-shrink-0 overflow-hidden">
                        {bg.url && <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-white text-sm truncate">{bg.name}</div>
                      </div>
                    </div>
                  ))}
                  {availableBackgrounds.length === 0 && !isLoading && (
                    <div className="text-center text-gray-500 py-4 text-sm">표시할 배경이 없습니다.</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-center text-gray-500 mt-4">
                Dropbox '/backgrounds' 폴더의 이미지를 불러옵니다.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
