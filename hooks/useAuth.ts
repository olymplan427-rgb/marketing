import { useState, useEffect, useRef } from 'react';
import { authService, AuthUser } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';

// 인증 확인 timeout (5초)
const AUTH_TIMEOUT_MS = 5000;

/**
 * useAuth - 인증 상태 관리를 위한 커스텀 훅
 *
 * Supabase 인증 상태를 관리하고, 인증 변경 시 Threads 토큰을 동기화합니다.
 *
 * @returns {Object} 인증 상태 및 관련 함수
 * - user: 현재 로그인한 사용자 (AuthUser | null)
 * - isLoading: 인증 상태 확인 중 여부
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Supabase가 설정되지 않은 경우 로딩 종료
      if (!isSupabaseConfigured()) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        // 현재 사용자 확인 (timeout 적용)
        const currentUser = await Promise.race([
          authService.getCurrentUser(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('인증 확인 시간 초과')), AUTH_TIMEOUT_MS)
          ),
        ]);

        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }

        // 인증 상태 변경 리스너 등록
        const { data: { subscription } } = authService.onAuthStateChange(async (authUser) => {
          if (isMounted) {
            setUser(authUser);
          }

          // 사용자가 로그인한 경우, Supabase에서 Threads 토큰을 가져와서 localStorage에 동기화
          if (authUser && isSupabaseConfigured()) {
            try {
              const { settingsService } = await import('../services/settingsService');
              const threadsTokens = await settingsService.getThreadsTokens();
              if (threadsTokens) {
                localStorage.setItem('threads_tokens', JSON.stringify(threadsTokens));
                console.log('Threads 토큰이 Supabase에서 localStorage로 동기화되었습니다.');
              }
            } catch (error) {
              console.error('Threads 토큰 동기화 실패:', error);
            }
          }
        });

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('인증 상태 확인 중 오류:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // 클린업: 컴포넌트 언마운트 시 구독 해제
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    user,
    isLoading,
  };
}
