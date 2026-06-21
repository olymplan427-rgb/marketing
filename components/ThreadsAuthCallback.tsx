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
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          {status === 'loading' && (
            <div style={styles.spinner}></div>
          )}
          {status === 'success' && (
            <div style={styles.successIcon}>✓</div>
          )}
          {status === 'error' && (
            <div style={styles.errorIcon}>✕</div>
          )}
        </div>

        <h2 style={styles.title}>
          {status === 'loading' && 'Threads 인증 처리 중'}
          {status === 'success' && '인증 완료'}
          {status === 'error' && '인증 실패'}
        </h2>

        <p style={styles.message}>{message}</p>

        {status === 'success' && (
          <p style={styles.subMessage}>잠시 후 메인 페이지로 이동합니다...</p>
        )}

        {status === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            style={styles.button}
          >
            메인 페이지로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  iconContainer: {
    marginBottom: '24px'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  },
  successIcon: {
    width: '64px',
    height: '64px',
    backgroundColor: '#4CAF50',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    color: 'white',
    fontSize: '32px',
    fontWeight: 'bold'
  },
  errorIcon: {
    width: '64px',
    height: '64px',
    backgroundColor: '#f44336',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    color: 'white',
    fontSize: '32px',
    fontWeight: 'bold'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '12px'
  },
  subMessage: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic'
  },
  button: {
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

// CSS 애니메이션 추가 (런타임에 삽입)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default ThreadsAuthCallback;
