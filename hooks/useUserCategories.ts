import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import type { BlogGenerationParams } from '../types';

/**
 * useUserCategories - 사용자 블로그 카테고리 관리 훅
 *
 * localStorage를 사용하여 사용자의 블로그 카테고리 목록을 영구 저장하고 관리합니다.
 * 카테고리 추가/삭제 기능을 제공하며, 삭제 시 현재 선택된 카테고리도 자동으로 업데이트합니다.
 */
export function useUserCategories(
  formState: BlogGenerationParams,
  setFormState: Dispatch<SetStateAction<BlogGenerationParams>>
) {
  const [userCategories, setUserCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('user_blog_categories');
      return saved ? JSON.parse(saved) : ['IT', '여행', '요리', '자기계발'];
    } catch {
      return ['IT', '여행', '요리', '자기계발'];
    }
  });

  const [newCategoryInput, setNewCategoryInput] = useState('');

  // localStorage 동기화
  useEffect(() => {
    localStorage.setItem('user_blog_categories', JSON.stringify(userCategories));
  }, [userCategories]);

  /**
   * 새 카테고리 추가
   * - 빈 문자열이나 중복 카테고리는 추가하지 않음
   * - 추가 후 자동으로 정렬
   */
  const handleAddCategory = () => {
    const trimmedCategory = newCategoryInput.trim();
    if (trimmedCategory && !userCategories.includes(trimmedCategory)) {
      setUserCategories((prev) => [...prev, trimmedCategory].sort());
      setNewCategoryInput('');
    } else if (trimmedCategory && userCategories.includes(trimmedCategory)) {
      alert('이미 등록된 카테고리입니다.');
      setNewCategoryInput('');
    }
  };

  /**
   * 카테고리 삭제
   * - 현재 formState에서 선택된 카테고리를 삭제하는 경우, formState도 자동으로 초기화
   */
  const handleRemoveCategory = (categoryToRemove: string) => {
    if (formState.category === categoryToRemove) {
      setFormState((prev) => ({ ...prev, category: '' }));
    }
    setUserCategories((prev) => prev.filter((c) => c !== categoryToRemove));
  };

  return {
    userCategories,
    newCategoryInput,
    setNewCategoryInput,
    handleAddCategory,
    handleRemoveCategory,
  };
}
