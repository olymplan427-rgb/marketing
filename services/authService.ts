import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

export class AuthService {
  /**
   * 이메일로 회원가입 (Magic Link)
   */
  async signUpWithEmail(email: string): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: { message: 'Supabase가 설정되지 않았습니다', name: 'SupabaseNotConfigured', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    return { error };
  }

  /**
   * 이메일로 로그인 (Magic Link)
   */
  async signInWithEmail(email: string): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      console.error('Supabase 클라이언트가 초기화되지 않았습니다');
      return { error: { message: 'Supabase가 설정되지 않았습니다', name: 'SupabaseNotConfigured', status: 500 } as AuthError };
    }

    console.log('Supabase Auth 요청 시작:', email);
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Supabase Auth 오류:', error);
      } else {
        console.log('Magic Link 발송 성공');
      }

      return { error };
    } catch (err) {
      console.error('Auth 요청 중 예외 발생:', err);
      return { error: { message: String(err), name: 'NetworkError', status: 0 } as AuthError };
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: { message: 'Supabase가 설정되지 않았습니다', name: 'SupabaseNotConfigured', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!supabase) {
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      emailConfirmed: !!user.email_confirmed_at,
    };
  }

  /**
   * 현재 세션 가져오기
   */
  async getSession(): Promise<Session | null> {
    if (!supabase) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          emailConfirmed: !!session.user.email_confirmed_at,
        });
      } else {
        callback(null);
      }
    });
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService();
