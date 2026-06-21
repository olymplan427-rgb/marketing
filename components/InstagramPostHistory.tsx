import React, { useState, useEffect, useCallback } from 'react';
import type { InstagramPost } from '../lib/supabase';
import { instagramService } from '../services/instagramService';

const InstagramPostHistory: React.FC = () => {
  // State
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    scheduled: 0,
    published: 0
  });

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.publish_status = statusFilter;
      }
      if (sourceFilter !== 'all') {
        filters.source = sourceFilter;
      }

      const postsData = await instagramService.getPosts(filters);
      setPosts(postsData);

      // Calculate stats
      const total = postsData.length;
      const draft = postsData.filter(p => p.publish_status === 'draft').length;
      const scheduled = postsData.filter(p => p.publish_status === 'scheduled').length;
      const published = postsData.filter(p => p.publish_status === 'published').length;

      setStats({ total, draft, scheduled, published });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '데이터 로드 실패';
      setError(errorMessage);
      console.error('❌ 포스트 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Delete post
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await instagramService.deletePost(id);
      await loadPosts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '삭제 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update publish status
  const handleUpdateStatus = async (id: string, newStatus: 'draft' | 'scheduled' | 'published') => {
    setLoading(true);
    try {
      await instagramService.updatePost(id, { publish_status: newStatus });
      await loadPosts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '상태 업데이트 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-chalk">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-graphite mb-2">
          📊 인스타그램 포스트 히스토리
        </h1>
        <p className="text-concrete">
          생성된 인스타그램 포스트를 관리하고 확인하세요
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-mist border border-hairline text-graphite p-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-1">오류 발생</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-concrete hover:text-graphite">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-mist p-4 rounded-card border border-hairline">
          <div className="text-2xl font-bold text-graphite">{stats.total}</div>
          <div className="text-sm text-concrete">전체</div>
        </div>
        <div className="bg-mist p-4 rounded-card border border-hairline">
          <div className="text-2xl font-bold text-graphite">{stats.draft}</div>
          <div className="text-sm text-concrete">임시저장</div>
        </div>
        <div className="bg-mist p-4 rounded-card border border-hairline">
          <div className="text-2xl font-bold text-graphite">{stats.scheduled}</div>
          <div className="text-sm text-concrete">예약됨</div>
        </div>
        <div className="bg-mist p-4 rounded-card border border-hairline">
          <div className="text-2xl font-bold text-graphite">{stats.published}</div>
          <div className="text-sm text-concrete">발행됨</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-mist p-4 rounded-card border border-hairline mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-2">
              발행 상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-chalk border border-hairline rounded-lg text-graphite"
            >
              <option value="all">전체</option>
              <option value="draft">임시저장</option>
              <option value="scheduled">예약됨</option>
              <option value="published">발행됨</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-graphite mb-2">
              생성 방식
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-chalk border border-hairline rounded-lg text-graphite"
            >
              <option value="all">전체</option>
              <option value="manual">수동 생성</option>
              <option value="ai">AI 생성</option>
              <option value="scheduled">자동 생성</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadPosts}
              disabled={loading}
              className="px-4 py-2 bg-graphite hover:bg-carbon disabled:bg-ash disabled:cursor-not-allowed text-chalk rounded-lg transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="text-center py-12 text-concrete">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p>로딩 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-mist rounded-card border border-hairline">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-concrete">생성된 포스트가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-chalk rounded-card border border-hairline overflow-hidden transition-colors"
            >
              {/* Image */}
              {post.image_url && (
                <div className="aspect-[4/5] bg-mist">
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.png';
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                {/* Question Text */}
                {post.question_text && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-graphite line-clamp-2">
                      {post.question_text}
                    </p>
                  </div>
                )}

                {/* Caption */}
                {post.caption && (
                  <p className="text-sm text-concrete mb-3 line-clamp-3">
                    {post.caption}
                  </p>
                )}

                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {post.hashtags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-mist border border-hairline text-graphite rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.hashtags.length > 3 && (
                      <span className="text-xs text-ash">
                        +{post.hashtags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Status & Meta */}
                <div className="flex items-center justify-between mb-3">
                  <select
                    value={post.publish_status || 'draft'}
                    onChange={(e) => handleUpdateStatus(post.id!, e.target.value as any)}
                    disabled={loading}
                    className="text-xs px-2 py-1 rounded-lg border border-hairline bg-chalk text-graphite"
                  >
                    <option value="draft">임시저장</option>
                    <option value="scheduled">예약됨</option>
                    <option value="published">발행됨</option>
                  </select>

                  <span className="text-xs text-ash">
                    {new Date(post.created_at!).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="flex-1 px-3 py-2 bg-mist hover:bg-mist border border-hairline rounded-lg text-sm text-graphite transition-colors"
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => handleDelete(post.id!)}
                    disabled={loading}
                    className="px-3 py-2 bg-chalk border border-hairline hover:bg-mist rounded-lg text-sm text-graphite transition-colors disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPost && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setSelectedPost(null)}
          />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-chalk border border-hairline rounded-card z-50 overflow-auto max-h-[90vh]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-graphite">
                  포스트 상세
                </h3>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-concrete hover:text-graphite text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedPost.image_url && (
                <div className="mb-4">
                  <img
                    src={selectedPost.image_url}
                    alt="Post"
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              <div className="space-y-4">
                {selectedPost.question_text && (
                  <div>
                    <h4 className="text-sm font-semibold text-graphite mb-1">
                      질문 텍스트
                    </h4>
                    <p className="text-graphite">{selectedPost.question_text}</p>
                  </div>
                )}

                {selectedPost.caption && (
                  <div>
                    <h4 className="text-sm font-semibold text-graphite mb-1">
                      캡션
                    </h4>
                    <p className="text-graphite whitespace-pre-wrap">
                      {selectedPost.caption}
                    </p>
                  </div>
                )}

                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-graphite mb-1">
                      해시태그
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.hashtags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-mist border border-hairline text-graphite rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-concrete">생성일:</span>
                    <p className="text-graphite">
                      {new Date(selectedPost.created_at!).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-concrete">상태:</span>
                    <p className="text-graphite">{selectedPost.publish_status}</p>
                  </div>
                  {selectedPost.source && (
                    <div>
                      <span className="text-concrete">생성 방식:</span>
                      <p className="text-graphite">{selectedPost.source}</p>
                    </div>
                  )}
                  {selectedPost.background_url && (
                    <div>
                      <span className="text-concrete">배경:</span>
                      <p className="text-graphite text-xs truncate">
                        {selectedPost.background_url}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InstagramPostHistory;
