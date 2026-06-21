import React, { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { isSupabaseConfigured } from '../lib/supabase';

interface SnsChannel {
  id: string;
  platform: string;
  url: string;
  addedDate: string;
}

const SNSManagement: React.FC = () => {
  const [snsChannels, setSnsChannels] = useState<SnsChannel[]>([]);
  const [newSnsPlatform, setNewSnsPlatform] = useState('');
  const [newSnsUrl, setNewSnsUrl] = useState('');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Supabase 또는 localStorage에서 SNS 채널 불러오기 (컴포넌트 마운트 시)
  useEffect(() => {
    const loadSnsChannels = async () => {
      if (!isSupabaseConfigured()) {
        // Supabase 미설정 시 localStorage에서 불러오기
        try {
          const saved = localStorage.getItem('sns_channels');
          if (saved) {
            setSnsChannels(JSON.parse(saved));
          }
        } catch (err) {
          console.error('localStorage에서 SNS 채널 불러오기 실패:', err);
        }
        return;
      }

      try {
        const settings = await settingsService.getSettings();

        if (settings && settings.sns_channels) {
          setSnsChannels(settings.sns_channels);
          // localStorage에도 캐시
          localStorage.setItem('sns_channels', JSON.stringify(settings.sns_channels));
        }
      } catch (err) {
        console.error('Supabase에서 SNS 채널 불러오기 실패:', err);
        // 실패 시 localStorage fallback
        try {
          const saved = localStorage.getItem('sns_channels');
          if (saved) {
            setSnsChannels(JSON.parse(saved));
          }
        } catch (localErr) {
          console.error('localStorage fallback 실패:', localErr);
        }
      }
    };

    loadSnsChannels().finally(() => {
      setIsInitialLoadComplete(true);
    });
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // localStorage 및 Supabase 저장
  useEffect(() => {
    // 초기 로딩 중에는 저장하지 않음 (덮어쓰기 방지)
    if (!isInitialLoadComplete) return;

    localStorage.setItem('sns_channels', JSON.stringify(snsChannels));

    // Supabase에도 저장
    if (isSupabaseConfigured()) {
      settingsService.updateSNSChannels(snsChannels)
        .catch(err => console.error('Supabase SNS 채널 저장 실패:', err));
    }
  }, [snsChannels, isInitialLoadComplete]);

  // SNS 채널 추가
  const handleAddSnsChannel = () => {
    if (!newSnsPlatform.trim()) {
      alert('SNS 채널을 선택해주세요.');
      return;
    }
    if (!newSnsUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    const newChannel: SnsChannel = {
      id: Date.now().toString(),
      platform: newSnsPlatform,
      url: newSnsUrl,
      addedDate: new Date().toISOString()
    };

    setSnsChannels(prev => [...prev, newChannel]);
    setNewSnsPlatform('');
    setNewSnsUrl('');
  };

  // SNS 채널 삭제
  const handleDeleteSnsChannel = (channelId: string) => {
    if (confirm('이 SNS 채널을 삭제하시겠습니까?')) {
      setSnsChannels(prev => prev.filter(c => c.id !== channelId));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-chalk rounded-card p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-graphite mb-2">운영중인 SNS</h2>
          <p className="text-concrete">
            운영 중인 SNS 채널을 등록하고 관리하세요. 등록된 채널은 자동화 작업에 활용됩니다.
          </p>
        </div>

        {/* SNS 채널 추가 폼 */}
        <div className="bg-mist rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-graphite mb-4">새 채널 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* SNS 플랫폼 선택 */}
            <div>
              <label className="block text-sm font-medium text-graphite mb-2">
                SNS 채널
              </label>
              <select
                value={newSnsPlatform}
                onChange={(e) => setNewSnsPlatform(e.target.value)}
                className="w-full px-4 py-3 bg-chalk border border-hairline rounded-lg text-graphite focus:ring-2 focus:ring-graphite focus:border-graphite"
              >
                <option value="">선택하세요</option>
                <option value="Threads">Threads</option>
                <option value="Instagram">Instagram</option>
                <option value="Twitter/X">Twitter/X</option>
                <option value="Facebook">Facebook</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Blog">Blog</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* URL 입력 */}
            <div>
              <label className="block text-sm font-medium text-graphite mb-2">
                URL
              </label>
              <input
                type="url"
                value={newSnsUrl}
                onChange={(e) => setNewSnsUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-chalk border border-hairline rounded-lg text-graphite placeholder-ash focus:ring-2 focus:ring-graphite focus:border-graphite"
              />
            </div>
          </div>

          <button
            onClick={handleAddSnsChannel}
            className="w-full px-6 py-3 bg-graphite text-chalk rounded-lg hover:bg-carbon transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            SNS 채널 추가
          </button>
        </div>

        {/* 등록된 SNS 채널 목록 */}
        <div>
          <h3 className="text-lg font-semibold text-graphite mb-4">
            등록된 채널 ({snsChannels.length})
          </h3>
          <div className="space-y-3">
            {snsChannels.length === 0 ? (
              <div className="text-center py-12 bg-mist rounded-lg border-2 border-dashed border-hairline">
                <svg className="w-16 h-16 text-ash mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-lg font-medium text-concrete mb-1">등록된 SNS 채널이 없습니다</p>
                <p className="text-sm text-concrete">위 양식을 사용하여 첫 번째 채널을 추가해보세요</p>
              </div>
            ) : (
              snsChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-5 bg-chalk border border-hairline rounded-lg hover:border-graphite transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 text-sm font-semibold bg-mist text-graphite border border-hairline rounded-full">
                        {channel.platform}
                      </span>
                      <span className="text-sm text-concrete">
                        {new Date(channel.addedDate).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-graphite hover:text-carbon hover:underline flex items-center gap-2 text-sm font-medium"
                    >
                      {channel.url}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteSnsChannel(channel.id)}
                    className="ml-4 p-3 text-graphite hover:bg-mist rounded-lg transition-colors"
                    title="채널 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SNSManagement;
