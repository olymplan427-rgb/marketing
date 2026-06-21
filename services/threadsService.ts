/**
 * Threads API Service
 * Meta Threads API 통합을 위한 서비스
 *
 * 주요 기능:
 * - OAuth 인증 플로우
 * - Threads 포스트 생성 및 발행
 * - 사용자 프로필 조회
 * - 액세스 토큰 관리
 */

import axios from 'axios';

// 환경 변수에서 Threads 설정 가져오기
const THREADS_APP_ID = import.meta.env.VITE_THREADS_APP_ID;
const THREADS_APP_SECRET = import.meta.env.VITE_THREADS_APP_SECRET;
const THREADS_REDIRECT_URI = import.meta.env.VITE_THREADS_REDIRECT_URI;

// Threads API Base URLs
const THREADS_GRAPH_API = 'https://graph.threads.net/v1.0';
const THREADS_AUTH_URL = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';

// 타입 정의
export interface ThreadsAuthTokens {
  access_token: string;
  user_id: string;
  expires_in?: number;
}

export interface ThreadsUserProfile {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
}

export interface ThreadsPostParams {
  text: string;
  media_type?: 'TEXT' | 'IMAGE' | 'VIDEO';
  image_url?: string;
  video_url?: string;
  reply_to_id?: string; // 댓글로 달 때 부모 포스트 ID
}

export interface ThreadsPostResult {
  id: string;
  permalink?: string;
}

/**
 * Threads OAuth 인증 URL 생성
 * 사용자를 Threads 로그인 페이지로 리다이렉트하기 위한 URL
 */
export function getThreadsAuthUrl(): string {
  // 현재 페이지 정보를 sessionStorage에 저장하여 콜백 후 복귀 가능하도록 함
  sessionStorage.setItem('threads_auth_return_page', 'threads-auto-posting');
  
  const params = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: THREADS_REDIRECT_URI,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
    state: generateRandomState() // CSRF 방지
  });

  return `${THREADS_AUTH_URL}?${params.toString()}`;
}

/**
 * 랜덤 state 생성 (CSRF 방지용)
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Authorization Code를 Access Token으로 교환
 * OAuth callback에서 받은 code를 사용하여 액세스 토큰 획득
 * CORS 문제 해결을 위해 백엔드 API를 통해 토큰 교환
 * Short-Lived Token을 Long-Lived Token(60일)으로 자동 교환
 */
export async function exchangeCodeForToken(code: string): Promise<ThreadsAuthTokens> {
  try {
    // 1단계: Authorization Code를 Short-Lived Token으로 교환
    const tokenApiUrl = window.location.origin + '/api/threads/token';
    console.log('1단계: 토큰 교환 API 호출:', tokenApiUrl);

    const tokenResponse = await axios.post(tokenApiUrl, {
      code: code
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const shortLivedToken = tokenResponse.data.access_token;
    const userId = tokenResponse.data.user_id;

    console.log('Short-lived token 획득 성공, Long-lived token으로 교환 시작...');

    // 2단계: Short-Lived Token을 Long-Lived Token으로 교환
    const exchangeApiUrl = window.location.origin + '/api/threads/exchange-token';
    const exchangeResponse = await axios.post(exchangeApiUrl, {
      short_lived_token: shortLivedToken
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const tokens: ThreadsAuthTokens = {
      access_token: exchangeResponse.data.access_token,
      user_id: userId,
      expires_in: exchangeResponse.data.expires_in // 60일
    };

    console.log('Long-lived token 교환 성공, 유효기간:', tokens.expires_in, '초');

    // 토큰을 localStorage와 Supabase에 저장
    await saveThreadsTokens(tokens);

    return tokens;
  } catch (error: any) {
    console.error('Threads 토큰 교환 실패:', error.response?.data || error);
    throw new Error(`토큰 교환 실패: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * 액세스 토큰을 localStorage와 Supabase에 저장
 */
export async function saveThreadsTokens(tokens: ThreadsAuthTokens): Promise<void> {
  const tokensWithTimestamp = {
    ...tokens,
    timestamp: Date.now()
  };

  // localStorage에 저장 (로컬 캐시)
  localStorage.setItem('threads_tokens', JSON.stringify(tokensWithTimestamp));

  // Supabase에 저장 (다른 브라우저와 공유)
  try {
    const { settingsService } = await import('./settingsService');
    await settingsService.updateThreadsTokens(tokensWithTimestamp);
    console.log('Threads 토큰이 Supabase에 저장되었습니다.');
  } catch (error) {
    console.error('Supabase에 Threads 토큰 저장 실패:', error);
    // Supabase 저장 실패해도 localStorage는 저장되므로 계속 진행
  }
}

/**
 * localStorage 또는 Supabase에서 액세스 토큰 가져오기
 * Supabase를 우선으로 하고, 없으면 localStorage에서 가져옴
 */
export async function getThreadsTokens(): Promise<ThreadsAuthTokens | null> {
  try {
    // 먼저 Supabase에서 가져오기 시도 (다른 브라우저와 동기화)
    try {
      const { settingsService } = await import('./settingsService');
      const supabaseTokens = await settingsService.getThreadsTokens();
      
      if (supabaseTokens && supabaseTokens.access_token) {
        // 토큰 만료 확인
        const expirationTime = 60 * 24 * 60 * 60 * 1000; // 60일 (Long-lived token)
        if (supabaseTokens.timestamp && Date.now() - supabaseTokens.timestamp > expirationTime) {
          // 만료된 토큰은 삭제
          await clearThreadsTokens();
          return null;
        }

        // Supabase에서 가져온 토큰을 localStorage에도 동기화
        localStorage.setItem('threads_tokens', JSON.stringify(supabaseTokens));
        
        return {
          access_token: supabaseTokens.access_token,
          user_id: supabaseTokens.user_id,
          expires_in: supabaseTokens.expires_in
        };
      }
    } catch (supabaseError) {
      console.warn('Supabase에서 Threads 토큰 가져오기 실패, localStorage 확인:', supabaseError);
    }

    // Supabase에서 가져오지 못한 경우 localStorage에서 가져오기
    const saved = localStorage.getItem('threads_tokens');
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // 토큰 만료 확인 (60일 - Long-lived token)
    const expirationTime = 60 * 24 * 60 * 60 * 1000; // 60일
    if (parsed.timestamp && Date.now() - parsed.timestamp > expirationTime) {
      await clearThreadsTokens();
      return null;
    }

    return {
      access_token: parsed.access_token,
      user_id: parsed.user_id,
      expires_in: parsed.expires_in
    };
  } catch (error) {
    console.error('Threads 토큰 로드 실패:', error);
    return null;
  }
}

/**
 * 동기식 버전 (기존 호환성 유지)
 * 비동기 함수가 필요한 곳에서는 getThreadsTokensAsync를 사용하세요.
 */
export function getThreadsTokensSync(): ThreadsAuthTokens | null {
  try {
    const saved = localStorage.getItem('threads_tokens');
    if (!saved) return null;

    const parsed = JSON.parse(saved);

    // 토큰 만료 확인 (60일 - Long-lived token)
    const expirationTime = 60 * 24 * 60 * 60 * 1000; // 60일
    if (parsed.timestamp && Date.now() - parsed.timestamp > expirationTime) {
      clearThreadsTokensSync();
      return null;
    }

    return {
      access_token: parsed.access_token,
      user_id: parsed.user_id,
      expires_in: parsed.expires_in
    };
  } catch (error) {
    console.error('Threads 토큰 로드 실패:', error);
    return null;
  }
}

/**
 * 저장된 토큰 삭제 (로그아웃)
 * localStorage와 Supabase 모두에서 삭제
 */
export async function clearThreadsTokens(): Promise<void> {
  // localStorage에서 삭제
  localStorage.removeItem('threads_tokens');

  // Supabase에서도 삭제
  try {
    const { settingsService } = await import('./settingsService');
    await settingsService.updateThreadsTokens(null);
    console.log('Threads 토큰이 Supabase에서 삭제되었습니다.');
  } catch (error) {
    console.error('Supabase에서 Threads 토큰 삭제 실패:', error);
  }
}

/**
 * 동기식 버전 (기존 호환성 유지)
 */
export function clearThreadsTokensSync(): void {
  localStorage.removeItem('threads_tokens');
}

/**
 * 사용자 프로필 조회
 * CORS 문제 해결을 위해 백엔드 API를 통해 프로필 조회
 */
export async function getThreadsUserProfile(): Promise<ThreadsUserProfile> {
  const tokens = await getThreadsTokens();
  if (!tokens) {
    throw new Error('Threads 인증이 필요합니다. 먼저 로그인해주세요.');
  }

  try {
    // 백엔드 API 엔드포인트를 통해 프로필 조회
    const apiUrl = window.location.origin + '/api/threads/profile';
    console.log('프로필 조회 API 호출:', apiUrl);

    const response = await axios.get(apiUrl, {
      params: {
        user_id: tokens.user_id,
        access_token: tokens.access_token
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Threads 프로필 조회 실패:', error.response?.data || error);

    // 토큰이 만료되었거나 유효하지 않은 경우
    if (error.response?.status === 401 || error.response?.status === 403) {
      await clearThreadsTokens();
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    throw new Error(`프로필 조회 실패: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Threads에 포스트 생성 (단계 1: 컨테이너 생성)
 * 실제 발행 전에 포스트 컨테이너를 먼저 생성
 */
export async function createThreadsMediaContainer(params: ThreadsPostParams): Promise<string> {
  const tokens = await getThreadsTokens();
  if (!tokens) {
    throw new Error('Threads 인증이 필요합니다. 먼저 로그인해주세요.');
  }

  const postData: any = {
    media_type: params.media_type || 'TEXT',
    text: params.text,
    access_token: tokens.access_token
  };

  try {
    console.log('📝 Threads 컨테이너 생성 시도:', {
      media_type: postData.media_type,
      text_length: params.text?.length || 0,
      has_reply_to: !!params.reply_to_id,
      user_id: tokens.user_id,
      token_length: tokens.access_token?.length,
      token_preview: tokens.access_token?.substring(0, 10) + '...'
    });

    // Reply로 달 경우 부모 포스트 ID 추가
    if (params.reply_to_id) {
      postData.reply_to_id = params.reply_to_id;
      // Reply control 기본값 설정 (누구나 답글 가능)
      postData.reply_control = 'everyone';
    }

    // 이미지 URL이 있는 경우
    if (params.image_url) {
      postData.image_url = params.image_url;
      postData.media_type = 'IMAGE';
    }

    // 비디오 URL이 있는 경우
    if (params.video_url) {
      postData.video_url = params.video_url;
      postData.media_type = 'VIDEO';
    }

    // URLSearchParams를 사용하여 form-urlencoded 형식으로 전송
    const formData = new URLSearchParams();
    formData.append('media_type', postData.media_type);
    formData.append('text', postData.text);
    formData.append('access_token', postData.access_token);

    if (postData.reply_to_id) {
      formData.append('reply_to_id', postData.reply_to_id);
      formData.append('reply_control', postData.reply_control);
    }

    if (postData.image_url) {
      formData.append('image_url', postData.image_url);
    }

    if (postData.video_url) {
      formData.append('video_url', postData.video_url);
    }

    const response = await axios.post(
      `${THREADS_GRAPH_API}/${tokens.user_id}/threads`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.id; // 컨테이너 ID 반환
  } catch (error: any) {
    console.error('❌ Threads 컨테이너 생성 실패 - 전체 에러:', error);
    console.error('❌ 에러 응답 데이터:', JSON.stringify(error.response?.data, null, 2));
    console.error('❌ 에러 상태 코드:', error.response?.status);
    console.error('❌ 요청 파라미터:', JSON.stringify({
      media_type: postData.media_type,
      text_length: postData.text?.length,
      has_image: !!postData.image_url,
      has_video: !!postData.video_url,
      has_reply_to: !!postData.reply_to_id
    }, null, 2));

    // 에러 메시지를 다양한 경로에서 추출 시도
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.error?.error_user_msg ||
      error.response?.data?.message ||
      JSON.stringify(error.response?.data) ||
      error.message;

    const errorType = error.response?.data?.error?.type;
    const statusCode = error.response?.status;

    // OAuthException 또는 401/403 에러는 인증 문제
    if (statusCode === 401 || statusCode === 403 ||
        (errorType === 'OAuthException' && statusCode === 500)) {
      clearThreadsTokens();
      throw new Error('인증이 만료되었거나 유효하지 않습니다. Threads 계정을 다시 연결해주세요.');
    }

    // Transient error 체크
    const isTransient = error.response?.data?.error?.is_transient === true;
    if (isTransient) {
      throw new Error(`포스트 생성 실패 (일시적 오류): ${errorMessage}. 잠시 후 다시 시도해주세요.`);
    }

    throw new Error(`포스트 생성 실패: ${errorMessage}`);
  }
}

/**
 * Threads 포스트 발행 (단계 2: 컨테이너 발행)
 * 생성된 컨테이너를 실제로 발행
 */
export async function publishThreadsMediaContainer(containerId: string): Promise<ThreadsPostResult> {
  const tokens = await getThreadsTokens();
  if (!tokens) {
    throw new Error('Threads 인증이 필요합니다. 먼저 로그인해주세요.');
  }

  try {
    // URLSearchParams를 사용하여 form-urlencoded 형식으로 전송
    const formData = new URLSearchParams();
    formData.append('creation_id', containerId);
    formData.append('access_token', tokens.access_token);

    const response = await axios.post(
      `${THREADS_GRAPH_API}/${tokens.user_id}/threads_publish`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      id: response.data.id,
      permalink: response.data.permalink
    };
  } catch (error: any) {
    console.error('❌ Threads 발행 실패 - 전체 에러:', error);
    console.error('❌ 에러 응답 데이터:', JSON.stringify(error.response?.data, null, 2));
    console.error('❌ 에러 상태 코드:', error.response?.status);
    console.error('❌ 컨테이너 ID:', containerId);

    // 에러 메시지를 다양한 경로에서 추출 시도
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.error?.error_user_msg ||
      error.response?.data?.message ||
      JSON.stringify(error.response?.data) ||
      error.message;

    const errorType = error.response?.data?.error?.type;
    const statusCode = error.response?.status;

    // OAuthException 또는 401/403 에러는 인증 문제
    if (statusCode === 401 || statusCode === 403 ||
        (errorType === 'OAuthException' && statusCode === 500)) {
      clearThreadsTokens();
      throw new Error('인증이 만료되었거나 유효하지 않습니다. Threads 계정을 다시 연결해주세요.');
    }

    throw new Error(`포스트 발행 실패: ${errorMessage}`);
  }
}

/**
 * Threads에 포스트 작성 (전체 플로우)
 * 컨테이너 생성 + 발행을 한 번에 처리
 * 일시적 에러 발생 시 자동 재시도 (최대 5회)
 */
export async function createAndPublishThreadsPost(params: ThreadsPostParams): Promise<ThreadsPostResult> {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5초

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1단계: 컨테이너 생성
      const containerId = await createThreadsMediaContainer(params);

      // 2단계: 발행
      const result = await publishThreadsMediaContainer(containerId);

      return result;
    } catch (error: any) {
      const isTransient = error.message?.includes('일시적 오류');
      const isLastAttempt = attempt === MAX_RETRIES;

      if (isTransient && !isLastAttempt) {
        console.warn(`⚠️ 일시적 오류 발생. ${RETRY_DELAY / 1000}초 후 재시도합니다... (시도 ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      throw new Error(`Threads 포스팅 실패: ${error.message}`);
    }
  }

  throw new Error('Threads 포스팅 실패: 최대 재시도 횟수를 초과했습니다.');
}

/**
 * Threads 스레드 형식 포스팅 (메인 + Reply 연결)
 * @param threadParts - 분할된 포스트 배열 (첫 번째 = 메인, 나머지 = Reply)
 * @returns 메인 포스트와 모든 Reply의 결과
 */
export async function createAndPublishThreadsThread(
  threadParts: string[]
): Promise<{
  mainPost: ThreadsPostResult;
  replies: ThreadsPostResult[];
}> {
  if (!threadParts || threadParts.length === 0) {
    throw new Error('포스팅할 콘텐츠가 없습니다.');
  }

  try {
    // 1. 메인 포스트 발행
    console.log('메인 포스트 발행 중...');
    const mainPost = await createAndPublishThreadsPost({
      text: threadParts[0],
      media_type: 'TEXT'
    });

    console.log('메인 포스트 발행 완료:', mainPost.id);

    const replies: ThreadsPostResult[] = [];

    // 2. Reply 포스트 순차 발행 (각 Reply는 이전 포스트에 연결)
    let previousPostId = mainPost.id;

    for (let i = 1; i < threadParts.length; i++) {
      console.log(`Reply ${i}/${threadParts.length - 1} 발행 중...`);

      // Rate limiting 방지를 위한 약간의 딜레이
      if (i > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }

      const reply = await createAndPublishThreadsPost({
        text: threadParts[i],
        media_type: 'TEXT',
        reply_to_id: previousPostId
      });

      console.log(`Reply ${i} 발행 완료:`, reply.id);
      replies.push(reply);
      previousPostId = reply.id; // 다음 Reply는 현재 Reply에 연결
    }

    console.log('스레드 발행 완료. 총', threadParts.length, '개 포스트');

    return {
      mainPost,
      replies
    };
  } catch (error: any) {
    console.error('스레드 포스팅 실패:', error);
    throw new Error(`스레드 포스팅 실패: ${error.message}`);
  }
}

/**
 * Threads 인증 상태 확인 (동기식)
 * 빠른 확인이 필요한 경우에만 사용하고, 정확한 상태 확인은 getThreadsTokens()를 사용하세요.
 */
export function isThreadsAuthenticated(): boolean {
  const tokens = getThreadsTokensSync();
  return tokens !== null && !!tokens.access_token;
}

/**
 * Threads 인증 상태 확인 (비동기식, Supabase 포함)
 */
export async function isThreadsAuthenticatedAsync(): Promise<boolean> {
  const tokens = await getThreadsTokens();
  return tokens !== null && !!tokens.access_token;
}

/**
 * Threads API 설정 확인
 */
export function isThreadsConfigured(): boolean {
  return !!(THREADS_APP_ID && THREADS_APP_SECRET && THREADS_REDIRECT_URI);
}

/**
 * Threads 토큰 및 권한 진단
 * 토큰 유효성, 권한, API 연결 상태를 종합적으로 확인
 */
export async function diagnoseThreadsConnection(): Promise<{
  success: boolean;
  message: string;
  details: {
    hasToken: boolean;
    tokenValid: boolean;
    userId?: string;
    username?: string;
    profileError?: string;
    apiConfigured: boolean;
    scopes?: string;
  };
}> {
  const result: any = {
    success: false,
    message: '',
    details: {
      hasToken: false,
      tokenValid: false,
      apiConfigured: isThreadsConfigured()
    }
  };

  // 1. API 설정 확인
  if (!result.details.apiConfigured) {
    result.message = 'Threads API가 설정되지 않았습니다. 환경 변수를 확인해주세요.';
    return result;
  }

  // 2. 토큰 존재 여부 확인
  const tokens = await getThreadsTokens();
  if (!tokens) {
    result.message = 'Threads 로그인이 필요합니다. 먼저 계정을 연결해주세요.';
    return result;
  }

  result.details.hasToken = true;
  result.details.userId = tokens.user_id;

  // 3. 토큰 유효성 확인 (프로필 조회)
  try {
    const profile = await getThreadsUserProfile();
    result.details.tokenValid = true;
    result.details.username = profile.username;
    result.success = true;
    result.message = `✅ 연결 정상: @${profile.username} (ID: ${tokens.user_id})`;
  } catch (error: any) {
    result.details.profileError = error.message;

    if (error.message.includes('인증이 만료')) {
      result.message = '❌ 토큰이 만료되었습니다. 다시 로그인해주세요.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      result.message = '❌ 인증 권한이 없습니다. 토큰을 재발급받아주세요.';
    } else {
      result.message = `❌ 연결 실패: ${error.message}`;
    }
    return result;
  }

  // 4. 권한 확인 (OAuth scope)
  result.details.scopes = 'threads_basic,threads_content_publish';

  return result;
}

/**
 * 간단한 토큰 테스트 (텍스트 포스트 생성만 테스트, 발행하지 않음)
 */
export async function testThreadsPostPermission(): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // 테스트용 컨테이너만 생성 (발행하지 않음)
    const testText = `테스트 포스트 (${new Date().toISOString()})`;
    const containerId = await createThreadsMediaContainer({
      text: testText,
      media_type: 'TEXT'
    });

    return {
      success: true,
      message: `✅ 포스팅 권한 정상 (컨테이너 ID: ${containerId})\n⚠️ 테스트 컨테이너는 자동으로 만료됩니다.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ 포스팅 권한 없음',
      error: error.message
    };
  }
}

/**
 * Threads 포스트 Insights 조회
 * @param mediaId - 포스트 ID
 * @returns 조회수, 좋아요, 댓글, 리포스트 등의 통계
 */
export interface ThreadsInsights {
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  reach?: number;
}

export async function getThreadsInsights(mediaId: string): Promise<ThreadsInsights> {
  const tokens = await getThreadsTokens();
  if (!tokens) {
    throw new Error('Threads 인증이 필요합니다. 먼저 로그인해주세요.');
  }

  try {
    // Threads Insights API: metric 파라미터로 원하는 지표 요청
    const metrics = ['views', 'likes', 'replies', 'reposts', 'quotes'];

    const formData = new URLSearchParams();
    formData.append('metric', metrics.join(','));
    formData.append('access_token', tokens.access_token);

    const response = await axios.get(
      `${THREADS_GRAPH_API}/${mediaId}/insights`,
      { params: Object.fromEntries(formData) }
    );

    // API 응답에서 insights 추출
    const insights: ThreadsInsights = {};
    const data = response.data.data || [];

    data.forEach((item: any) => {
      if (item.name && item.values && item.values.length > 0) {
        const value = item.values[0].value;
        insights[item.name as keyof ThreadsInsights] = value;
      }
    });

    return insights;
  } catch (error: any) {
    console.error('Threads Insights 조회 실패:', error.response?.data || error);

    // 403/404 에러는 Insights를 지원하지 않는 포스트일 수 있음
    if (error.response?.status === 403 || error.response?.status === 404) {
      return {}; // 빈 객체 반환
    }

    throw new Error(`Insights 조회 실패: ${error.response?.data?.error?.message || error.message}`);
  }
}

// 기본 export
export const threadsService = {
  getAuthUrl: getThreadsAuthUrl,
  exchangeCodeForToken,
  saveTokens: saveThreadsTokens,
  getTokens: getThreadsTokens,
  getTokensSync: getThreadsTokensSync,
  clearTokens: clearThreadsTokens,
  clearTokensSync: clearThreadsTokensSync,
  getUserProfile: getThreadsUserProfile,
  createMediaContainer: createThreadsMediaContainer,
  publishMediaContainer: publishThreadsMediaContainer,
  createAndPublishPost: createAndPublishThreadsPost,
  createAndPublishThread: createAndPublishThreadsThread,
  getInsights: getThreadsInsights,
  isAuthenticated: isThreadsAuthenticated,
  isAuthenticatedAsync: isThreadsAuthenticatedAsync,
  isConfigured: isThreadsConfigured,
  diagnoseConnection: diagnoseThreadsConnection,
  testPostPermission: testThreadsPostPermission
};
