import React, { useState, useEffect } from 'react';
import { historyService } from '../services/historyService';
import { ContentHistory, isSupabaseConfigured } from '../lib/supabase';

interface ContentHistoryPageProps {
  onRestoreBlogPost?: (content: ContentHistory) => void;
}

const ContentHistoryPage: React.FC<ContentHistoryPageProps> = ({ onRestoreBlogPost }) => {
  const [histories, setHistories] = useState<ContentHistory[]>([]);
  const [filteredHistories, setFilteredHistories] = useState<ContentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'blog' | 'instagram' | 'threads'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<ContentHistory | null>(null);
  const [stats, setStats] = useState({ total: 0, byType: { blog: 0, instagram: 0, threads: 0 } });
  const [isConfigured] = useState(isSupabaseConfigured());

  // 히스토리 로드
  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  // 필터링
  useEffect(() => {
    let filtered = histories;

    if (selectedType !== 'all') {
      filtered = filtered.filter(h => h.content_type === selectedType);
    }

    if (searchTerm) {
      filtered = filtered.filter(h =>
        h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHistories(filtered);
  }, [histories, selectedType, searchTerm]);

  const loadHistory = async () => {
    setIsLoading(true);
    const data = await historyService.getContentHistory();
    // threads 타입 중 published(초안 사용됨) 상태만 표시, pending/draft-created/isPersona는 제외
    const filteredData = data.filter(item => {
      // threads 타입 확인
      if (item.content_type === 'threads') {
        const metadata = item.metadata as any;
        // isPersona 플래그가 있으면 제외 (내부 설정용)
        if (metadata?.isPersona === true) {
          return false;
        }
        // published 상태만 표시
        return metadata?.status === 'published';
      }
      return true;
    });
    setHistories(filteredData);
    setIsLoading(false);
  };

  const loadStats = async () => {
    const statsData = await historyService.getStatistics();
    // published 상태의 threads만 통계에 포함
    // (pending/draft-created는 제외되어 실제 발행된 수만 카운트)
    setStats(statsData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 컨텐츠를 삭제하시겠습니까?')) return;

    const success = await historyService.deleteContent(id);
    if (success) {
      await loadHistory();
      await loadStats();
      if (selectedContent?.id === id) {
        setSelectedContent(null);
      }
    } else {
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blog': return '블로그';
      case 'instagram': return '인스타그램';
      case 'threads': return '쓰레드';
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'blog': return 'bg-mist text-graphite border border-hairline';
      case 'instagram': return 'bg-mist text-graphite border border-hairline';
      case 'threads': return 'bg-mist text-graphite border border-hairline';
      default: return 'bg-mist text-graphite border border-hairline';
    }
  };

  // Supabase 미설정 상태 표시
  if (!isConfigured) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-chalk rounded-card p-8">
          <div className="text-center py-12">
            <svg className="w-20 h-20 text-graphite mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-graphite mb-3">Supabase 설정이 필요합니다</h2>
            <p className="text-concrete mb-6 max-w-2xl mx-auto">
              컨텐츠 히스토리 기능을 사용하려면 Supabase 데이터베이스를 설정해야 합니다.
            </p>

            <div className="bg-mist rounded-lg p-6 text-left max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-graphite mb-4">설정 방법:</h3>
              <ol className="space-y-3 text-sm text-concrete">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-graphite">1.</span>
                  <span>Supabase 대시보드에서 Project URL과 anon key 복사</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-graphite">2.</span>
                  <span>프로젝트 루트에 <code className="px-2 py-1 bg-mist border border-hairline rounded">.env</code> 파일 생성</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-graphite">3.</span>
                  <div>
                    <div>다음 내용 입력:</div>
                    <pre className="mt-2 p-3 bg-mist border border-hairline rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here`}
                    </pre>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-graphite">4.</span>
                  <span><code className="px-2 py-1 bg-mist border border-hairline rounded">supabase-schema.sql</code> 파일의 SQL을 Supabase SQL Editor에서 실행</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-graphite">5.</span>
                  <span>개발 서버 재시작</span>
                </li>
              </ol>
            </div>

            <div className="mt-6">
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-graphite text-chalk rounded-lg hover:bg-carbon transition-colors font-medium"
              >
                Supabase 시작하기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <p className="mt-6 text-sm text-concrete">
              자세한 설명은 프로젝트의 <code className="px-2 py-1 bg-mist border border-hairline rounded">SUPABASE_SETUP.md</code> 파일을 참고하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-chalk rounded-lg p-4 border border-hairline">
          <div className="text-sm text-concrete mb-1">전체</div>
          <div className="text-2xl font-bold text-graphite">{stats.total}</div>
        </div>
        <div className="bg-chalk rounded-lg p-4 border border-hairline">
          <div className="text-sm text-concrete mb-1">블로그</div>
          <div className="text-2xl font-bold text-graphite">{stats.byType.blog}</div>
        </div>
        <div className="bg-chalk rounded-lg p-4 border border-hairline">
          <div className="text-sm text-concrete mb-1">인스타그램</div>
          <div className="text-2xl font-bold text-graphite">{stats.byType.instagram}</div>
        </div>
        <div className="bg-chalk rounded-lg p-4 border border-hairline">
          <div className="text-sm text-concrete mb-1">쓰레드</div>
          <div className="text-2xl font-bold text-graphite">{stats.byType.threads}</div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-chalk rounded-card p-6 mb-6 border border-hairline">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 타입 필터 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'all'
                  ? 'bg-graphite text-chalk'
                  : 'bg-mist text-concrete hover:bg-concrete/10'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setSelectedType('blog')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'blog'
                  ? 'bg-graphite text-chalk'
                  : 'bg-mist text-concrete hover:bg-concrete/10'
              }`}
            >
              블로그
            </button>
            <button
              onClick={() => setSelectedType('instagram')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'instagram'
                  ? 'bg-graphite text-chalk'
                  : 'bg-mist text-concrete hover:bg-concrete/10'
              }`}
            >
              인스타그램
            </button>
            <button
              onClick={() => setSelectedType('threads')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedType === 'threads'
                  ? 'bg-graphite text-chalk'
                  : 'bg-mist text-concrete hover:bg-concrete/10'
              }`}
            >
              쓰레드
            </button>
          </div>

          {/* 검색 */}
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="제목이나 내용으로 검색..."
              className="w-full px-4 py-2 bg-chalk border border-hairline rounded-lg text-graphite placeholder-ash focus:ring-2 focus:ring-graphite focus:border-graphite"
            />
          </div>
        </div>
      </div>

      {/* 컨텐츠 목록 */}
      <div className="bg-chalk rounded-card p-6 border border-hairline">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-graphite">
            저장된 컨텐츠 ({filteredHistories.length})
          </h2>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-graphite text-chalk rounded-lg hover:bg-carbon transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-graphite mx-auto"></div>
            <p className="mt-4 text-concrete">로딩 중...</p>
          </div>
        ) : filteredHistories.length === 0 ? (
          <div className="text-center py-12 bg-mist rounded-lg border-2 border-dashed border-hairline">
            <svg className="w-16 h-16 text-ash mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-concrete mb-1">저장된 컨텐츠가 없습니다</p>
            <p className="text-sm text-concrete">컨텐츠를 생성하고 저장해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistories.map((history) => (
              <div
                key={history.id}
                className="flex items-start justify-between p-4 bg-mist border border-hairline rounded-lg hover:border-graphite transition-colors cursor-pointer"
                onClick={() => setSelectedContent(history)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(history.content_type)}`}>
                      {getTypeLabel(history.content_type)}
                    </span>
                    <span className="text-xs text-concrete">
                      {formatDate(history.created_at!)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-graphite mb-1 truncate">
                    {history.title}
                  </h3>
                  <p className="text-sm text-concrete line-clamp-2">
                    {history.content.substring(0, 150)}...
                  </p>
                  {history.metadata && Object.keys(history.metadata).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {history.metadata.keywords && (
                        <span className="text-xs px-2 py-1 bg-mist text-graphite border border-hairline rounded">
                          {history.metadata.keywords.split(',')[0]}
                        </span>
                      )}
                      {history.metadata.category && (
                        <span className="text-xs px-2 py-1 bg-mist text-graphite border border-hairline rounded">
                          {history.metadata.category}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(history.id!);
                  }}
                  className="ml-4 p-2 text-graphite hover:bg-mist rounded-lg transition-colors"
                  title="삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상세 보기 모달 */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContent(null)}>
          <div className="bg-chalk rounded-card max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-hairline" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-chalk border-b border-hairline p-6 flex items-center justify-between">
              <div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getTypeBadgeColor(selectedContent.content_type)}`}>
                  {getTypeLabel(selectedContent.content_type)}
                </span>
                <h2 className="text-2xl font-bold text-graphite mt-2">{selectedContent.title}</h2>
                <p className="text-sm text-concrete mt-1">
                  {formatDate(selectedContent.created_at!)}
                </p>
              </div>
              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-mist rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-concrete" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-graphite bg-mist p-4 rounded-lg">
                  {selectedContent.content}
                </pre>
              </div>
              {selectedContent.images && selectedContent.images.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-graphite mb-3">
                    이미지 프롬프트 ({selectedContent.images.length}개)
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedContent.images.map((img, idx) => (
                      <div key={idx} className="bg-mist p-4 rounded-lg border border-hairline">
                        {/* 원본 프롬프트 */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-concrete mb-1">원본 설명:</p>
                          <p className="text-sm text-graphite">{img.prompt}</p>
                        </div>

                        {/* 이미지 생성 프롬프트 */}
                        {img.midjourneyPrompt && (
                          <div className="mb-3 p-3 bg-mist rounded-lg border border-hairline">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-graphite" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                              </svg>
                              <p className="text-xs font-semibold text-graphite">이미지 생성 프롬프트:</p>
                            </div>
                            <p className="text-sm text-graphite font-mono bg-chalk p-2 rounded border border-hairline">
                              {img.midjourneyPrompt}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(img.midjourneyPrompt!);
                                alert('이미지 생성 프롬프트가 복사되었습니다!');
                              }}
                              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-graphite text-chalk rounded-lg hover:bg-carbon transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              프롬프트 복사
                            </button>
                          </div>
                        )}

                        {/* Gemini 생성 이미지 */}
                        {img.geminiImageUrl && img.geminiImageUrl !== 'error' && (
                          <div>
                            <p className="text-xs font-semibold text-concrete mb-2">Gemini 생성 이미지:</p>
                            <img src={img.geminiImageUrl} alt={img.prompt} className="w-full rounded-lg border border-hairline" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedContent.content_type === 'blog' && onRestoreBlogPost && (
                <div className="mt-6 pt-6 border-t border-hairline">
                  <button
                    onClick={() => {
                      onRestoreBlogPost(selectedContent);
                      setSelectedContent(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-graphite text-chalk rounded-lg hover:bg-carbon transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>블로그 에디터로 불러오기</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentHistoryPage;
