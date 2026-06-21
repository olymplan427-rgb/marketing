import React, { useState } from 'react';
import { authService } from '../services/authService';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage({ type: 'error', text: '이메일을 입력해주세요.' });
      return;
    }

    // 간단한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error } = await authService.signInWithEmail(email);

    if (error) {
      setMessage({ type: 'error', text: `로그인 실패: ${error.message}` });
      setIsLoading(false);
      return;
    }

    setMessage({
      type: 'success',
      text: '이메일로 로그인 링크를 발송했습니다. 이메일을 확인해주세요.'
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chalk p-4">
      <div className="bg-chalk rounded-card border border-hairline p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-graphite mb-2">AI 블로그 포스트 생성기</h1>
          <p className="text-concrete">이메일로 간편하게 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-graphite mb-2">
              이메일 주소
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-graphite focus:border-transparent transition-colors"
              disabled={isLoading}
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-mist border border-hairline text-graphite'
                : 'bg-graphite text-chalk'
            }`}>
              <p className="text-sm">
                <span className="font-bold mr-1.5">{message.type === 'success' ? '✓' : '!'}</span>
                {message.text}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-graphite text-chalk py-3 rounded-lg font-medium hover:bg-carbon disabled:bg-ash disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '발송 중...' : '로그인 링크 받기'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-hairline">
          <p className="text-xs text-concrete text-center">
            로그인하면 모든 기기에서 동일한 설정과 콘텐츠에 접근할 수 있습니다.
            <br />
            이메일로 발송된 로그인 링크를 클릭하면 자동으로 로그인됩니다.
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-concrete">
            처음 사용하시나요? 이메일을 입력하면 자동으로 계정이 생성됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
