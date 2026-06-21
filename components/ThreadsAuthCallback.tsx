/**
 * Threads OAuth Callback Handler
 * Threads OAuth 인증 후 콜백을 처리하는 컴포넌트
 */

import React, { useEffect, useState } from 'react';
import { threadsService } from '../services/threadsService';

interface ThreadsAuthCallbackProps {
  onAuthSuccess?: () => void;
  onAuthError?: (error: string) => void;
}

const ThreadsAuthCallback: React.FC<ThreadsAuthCallbackProps> = ({
  onAuthSuccess,
  onAuthError
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Threads 인증 처리 중...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // URL에서 authorization code 추출
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // 에러가 있는 경우
      if (error) {
        const errorMsg = `인증 실패: ${errorDescription || error}`;
        setStatus('error');
        setMessage(errorMsg);
        onAuthError?.(errorMsg);
        return;
      }

      // Authorization code가 없는 경우
      if (!code) {
        const errorMsg = '인증 코드를 찾을 수 없습니다.';
        setStatus('error');
        setMessage(errorMsg);
        onAuthError?.(errorMsg);
        return;
      }

      // Authorization code를 액세스 토큰으로 교환
      setMessage('액세스 토큰을 가져오는 중...');
      await threadsService.exchangeCodeForToken(code);

      // 성공
      setStatus('success');
      setMessage('Threads 인증이 완료되었습니다!');
      onAuthSuccess?.();

      // 인증 완료 후 이전 페이지로 돌아가기 (Threads 포스트 페이지)
      // sessionStorage에서 이전 페이지 정보 확인
      const returnToPage = sessionStorage.getItem('threads_auth_return_page') || 'threads-auto-posting';
      sessionStorage.removeItem('threads_auth_return_page'); // 사용 후 삭제

      // 1초 후 Threads 포스트 페이지로 이동 (상태 업데이트를 위해 짧은 딜레이)
      setTimeout(() => {
        // URL 파라미터에 인증 완료 플래그 추가하여 상태 업데이트 트리거
        window.location.href = `/?menu=threads-auto-posting&auth=success`;
      }, 1000);

    } catch (error: any) {
      console.error('Threads 인증 처리 실패:', error);
      setStatus('error');
      setMessage(error.message || '인증 처리 중 오류가 발생했습니다.');
      onAuthError?.(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-chalk p-5">
      <div className="bg-chalk rounded-card border border-hairline p-10 max-w-[500px] w-full text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-12 h-12 border-4 border-hairline border-t-graphite rounded-full animate-spin mx-auto"></div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-graphite rounded-full flex items-center justify-center mx-auto text-chalk text-3xl font-bold">✓</div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-graphite rounded-full flex items-center justify-center mx-auto text-chalk text-3xl font-bold">✕</div>
          )}
        </div>

        <h2 className="text-2xl font-bold mb-4 text-graphite">
          {status === 'loading' && 'Threads 인증 처리 중'}
          {status === 'success' && '인증 완료'}
          {status === 'error' && '인증 실패'}
        </h2>

        <p className="text-base text-concrete mb-3">{message}</p>

        {status === 'success' && (
          <p className="text-sm text-ash italic">잠시 후 메인 페이지로 이동합니다...</p>
        )}

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            className="mt-5 px-6 py-3 bg-graphite text-chalk rounded-lg text-base cursor-pointer hover:bg-carbon transition-colors"
          >
            메인 페이지로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
};

export default ThreadsAuthCallback;
