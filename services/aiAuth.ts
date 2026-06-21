// AI 서버리스 프록시 공용 유틸
//
// 모든 AI 호출(Gemini/OpenAI/Anthropic)은 같은 출처의 /api/proxy/* 로 보내고,
// 실제 API 키는 서버(Vercel env)에서 주입한다. 브라우저에는 키가 전혀 노출되지 않는다.
// 프록시 남용 방지를 위해 Supabase access token을 x-app-token 헤더로 함께 보낸다.

let aiAuthToken: string | null = null;

export function setAiAuthToken(token: string | null): void {
  aiAuthToken = token || null;
}

export function getAiAuthToken(): string | null {
  return aiAuthToken;
}

// 동일 출처 base URL (브라우저 환경 전용)
export const proxyBase = (): string =>
  typeof window !== 'undefined' ? window.location.origin : '';

// Anthropic/OpenAI SDK용 커스텀 fetch: 매 요청마다 최신 토큰을 x-app-token 헤더로 주입
export const proxyFetch = ((input: any, init: any = {}) => {
  const headers = new Headers(init?.headers || {});
  if (aiAuthToken) headers.set('x-app-token', aiAuthToken);
  return fetch(input, { ...init, headers });
}) as typeof fetch;
