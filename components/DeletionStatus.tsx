/**
 * Data Deletion Status Page
 * Meta의 데이터 삭제 요청 상태를 표시하는 페이지
 */

import React, { useEffect, useState } from 'react';

const DeletionStatus: React.FC = () => {
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  useEffect(() => {
    // URL 파라미터에서 확인 코드 추출
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    setConfirmationCode(code);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <div style={styles.successIcon}>✓</div>
        </div>

        <h1 style={styles.title}>데이터 삭제 요청 완료</h1>

        <div style={styles.content}>
          <p style={styles.message}>
            귀하의 데이터 삭제 요청이 정상적으로 접수되었습니다.
          </p>

          {confirmationCode && (
            <div style={styles.codeBox}>
              <p style={styles.codeLabel}>확인 코드:</p>
              <code style={styles.code}>{confirmationCode}</code>
            </div>
          )}

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>처리 내역:</h3>
            <ul style={styles.list}>
              <li>✓ Threads 연동 정보 삭제</li>
              <li>✓ 저장된 포스트 데이터 삭제</li>
              <li>✓ 액세스 토큰 무효화</li>
            </ul>
          </div>

          <p style={styles.note}>
            모든 데이터는 30일 이내에 완전히 삭제됩니다.
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          style={styles.button}
        >
          홈으로 돌아가기
        </button>
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
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  iconContainer: {
    marginBottom: '24px'
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
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#333'
  },
  content: {
    textAlign: 'left',
    marginBottom: '32px'
  },
  message: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  codeBox: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  codeLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px'
  },
  code: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace'
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: '12px'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  note: {
    fontSize: '14px',
    color: '#999',
    fontStyle: 'italic'
  },
  button: {
    padding: '12px 32px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default DeletionStatus;
