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
    <div className="flex justify-center items-center min-h-screen bg-chalk p-5">
      <div className="bg-chalk rounded-card border border-hairline p-10 max-w-[600px] w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-graphite rounded-full flex items-center justify-center mx-auto text-chalk text-3xl font-bold">✓</div>
        </div>

        <h1 className="text-[28px] font-bold mb-6 text-graphite">데이터 삭제 요청 완료</h1>

        <div className="text-left mb-8">
          <p className="text-base text-concrete mb-6 leading-relaxed">
            귀하의 데이터 삭제 요청이 정상적으로 접수되었습니다.
          </p>

          {confirmationCode && (
            <div className="bg-mist p-4 rounded-lg mb-6">
              <p className="text-sm text-concrete mb-2">확인 코드:</p>
              <code className="text-lg font-bold text-graphite font-mono">{confirmationCode}</code>
            </div>
          )}

          <div className="bg-mist p-5 rounded-lg mb-6">
            <h3 className="text-base font-bold text-graphite mb-3">처리 내역:</h3>
            <ul className="list-none p-0 m-0 text-graphite">
              <li>✓ Threads 연동 정보 삭제</li>
              <li>✓ 저장된 포스트 데이터 삭제</li>
              <li>✓ 액세스 토큰 무효화</li>
            </ul>
          </div>

          <p className="text-sm text-ash italic">
            모든 데이터는 30일 이내에 완전히 삭제됩니다.
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-graphite text-chalk rounded-lg text-base cursor-pointer hover:bg-carbon transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default DeletionStatus;
