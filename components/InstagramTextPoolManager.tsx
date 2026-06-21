import React, { useState, useEffect, useCallback } from 'react';
import type { InstagramTextPool } from '../lib/supabase';
import {
  getTextPool,
  addTextToPool,
  updateTextPoolItem,
  deleteTextPoolItem,
  markTextAsUsed,
  getCategories,
  getTextPoolStats,
  getRandomUnusedText
} from '../services/instagramTextPoolService';

const InstagramTextPoolManager: React.FC = () => {
  // State
  const [texts, setTexts] = useState<InstagramTextPool[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, used: 0, unused: 0, aiGenerated: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filterUsed, setFilterUsed] = useState<boolean | undefined>(undefined);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    caption: '',
    category: '',
    tags: [] as string[],
    ai_generated: false,
    prompt: ''
  });

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 텍스트 목록 로드
      const filters: any = {};
      if (selectedCategory) filters.category = selectedCategory;
      if (filterUsed !== undefined) filters.isUsed = filterUsed;

      const textsData = await getTextPool(filters);
      setTexts(textsData);

      // 카테고리 목록 로드
      const categoriesData = await getCategories();
      setCategories(categoriesData);

      // 통계 로드
      const statsData = await getTextPoolStats();
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '데이터 로드 실패';
      setError(errorMessage);
      console.error('❌ 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, filterUsed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 새 텍스트 추가
  const handleAdd = async () => {
    if (!formData.text.trim()) {
      alert('텍스트를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await addTextToPool({
        text: formData.text,
        caption: formData.caption || undefined,
        category: formData.category || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        ai_generated: formData.ai_generated,
        prompt: formData.prompt || undefined
      });

      // 폼 초기화
      setFormData({
        text: '',
        caption: '',
        category: '',
        tags: [],
        ai_generated: false,
        prompt: ''
      });
      setShowAddForm(false);

      // 목록 새로고침
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '추가 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 텍스트 수정
  const handleUpdate = async () => {
    if (!editingId) return;

    setLoading(true);
    try {
      await updateTextPoolItem(editingId, {
        text: formData.text,
        caption: formData.caption || undefined,
        category: formData.category || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined
      });

      setEditingId(null);
      setFormData({
        text: '',
        caption: '',
        category: '',
        tags: [],
        ai_generated: false,
        prompt: ''
      });

      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '수정 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 텍스트 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await deleteTextPoolItem(id);
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '삭제 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 사용됨 표시
  const handleMarkAsUsed = async (id: string) => {
    setLoading(true);
    try {
      await markTextAsUsed(id);
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '업데이트 실패';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 편집 시작
  const startEdit = (text: InstagramTextPool) => {
    setEditingId(text.id!);
    setFormData({
      text: text.text,
      caption: text.caption || '',
      category: text.category || '',
      tags: text.tags || [],
      ai_generated: text.ai_generated || false,
      prompt: text.prompt || ''
    });
    setShowAddForm(true);
  };

  // 랜덤 미사용 텍스트 가져오기
  const handleGetRandom = async () => {
    try {
      const randomText = await getRandomUnusedText(selectedCategory || undefined);
      if (randomText) {
        alert(`랜덤 텍스트:\n\n${randomText.text}\n\n캡션: ${randomText.caption || '없음'}`);
      } else {
        alert('사용 가능한 미사용 텍스트가 없습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '조회 실패';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📝 텍스트 풀 관리</h1>
          <p className="text-gray-400">인스타그램 포스트에 사용할 질문 텍스트를 관리합니다</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-500/20 text-red-300 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">오류 발생</h3>
                <p className="text-sm">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-indigo-400">{stats.total}</div>
            <div className="text-sm text-gray-400">전체</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{stats.unused}</div>
            <div className="text-sm text-gray-400">미사용</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-gray-400">{stats.used}</div>
            <div className="text-sm text-gray-400">사용됨</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">{stats.aiGenerated}</div>
            <div className="text-sm text-gray-400">AI 생성</div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              >
                <option value="">모든 카테고리</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Used Filter */}
              <select
                value={filterUsed === undefined ? '' : filterUsed.toString()}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterUsed(val === '' ? undefined : val === 'true');
                }}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              >
                <option value="">전체</option>
                <option value="false">미사용만</option>
                <option value="true">사용됨만</option>
              </select>

              <button
                onClick={handleGetRandom}
                disabled={loading}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm disabled:opacity-50"
              >
                🎲 랜덤 선택
              </button>
            </div>

            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingId(null);
                setFormData({
                  text: '',
                  caption: '',
                  category: '',
                  tags: [],
                  ai_generated: false,
                  prompt: ''
                });
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
            >
              + 새 텍스트 추가
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '텍스트 수정' : '새 텍스트 추가'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  질문 텍스트 *
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  rows={3}
                  placeholder="예: 오늘 하루 중 가장 기억에 남는 순간은?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  캡션 (선택사항)
                </label>
                <textarea
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  rows={2}
                  placeholder="인스타그램 포스트 캡션"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="예: 자기성찰"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI 생성 여부
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={formData.ai_generated}
                      onChange={(e) => setFormData({ ...formData, ai_generated: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">AI로 생성됨</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  disabled={loading || !formData.text.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
                >
                  {loading ? '처리 중...' : editingId ? '수정' : '추가'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({
                      text: '',
                      caption: '',
                      category: '',
                      tags: [],
                      ai_generated: false,
                      prompt: ''
                    });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text List */}
        <div className="space-y-3">
          {loading && texts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p>로딩 중...</p>
            </div>
          ) : texts.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-400 mb-4">텍스트 풀이 비어있습니다</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
              >
                첫 텍스트 추가하기
              </button>
            </div>
          ) : (
            texts.map((text) => (
              <div
                key={text.id}
                className={`bg-gray-800 p-4 rounded-lg border ${
                  text.is_used ? 'border-gray-700 opacity-60' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {text.is_used && (
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                          사용됨
                        </span>
                      )}
                      {text.ai_generated && (
                        <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded">
                          AI 생성
                        </span>
                      )}
                      {text.category && (
                        <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs rounded">
                          {text.category}
                        </span>
                      )}
                    </div>

                    <p className="text-white mb-2">{text.text}</p>

                    {text.caption && (
                      <p className="text-sm text-gray-400 mb-2">캡션: {text.caption}</p>
                    )}

                    <p className="text-xs text-gray-500">
                      생성: {new Date(text.created_at!).toLocaleDateString('ko-KR')}
                      {text.used_at && ` | 사용: ${new Date(text.used_at).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!text.is_used && (
                      <>
                        <button
                          onClick={() => startEdit(text)}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleMarkAsUsed(text.id!)}
                          className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm"
                        >
                          ✓
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(text.id!)}
                      className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramTextPoolManager;
