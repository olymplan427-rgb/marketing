import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthUser } from '../services/authService';

/**
 * AuthContext - 인증 상태를 전역에서 관리하는 Context
 */
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - 인증 상태를 제공하는 Provider 컴포넌트
 */
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext - AuthContext를 사용하는 커스텀 훅
 *
 * 컴포넌트에서 인증 상태에 접근할 때 사용합니다.
 *
 * @example
 * const { user, isLoading } = useAuthContext();
 *
 * if (isLoading) return <div>로딩 중...</div>;
 * if (!user) return <div>로그인이 필요합니다</div>;
 *
 * @returns {AuthContextType} 인증 상태 객체
 * @throws {Error} AuthProvider 외부에서 사용 시 에러 발생
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
}
