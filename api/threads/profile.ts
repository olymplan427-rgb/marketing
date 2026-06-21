/**
 * Threads User Profile API
 *
 * Threads 사용자 프로필을 조회하는 서버사이드 엔드포인트
 * CORS 문제를 해결하기 위해 백엔드에서 프로필 조회 처리
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const THREADS_GRAPH_API = 'https://graph.threads.net/v1.0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, access_token } = req.query;

    if (!user_id || !access_token) {
      console.error('Missing parameters:', { hasUserId: !!user_id, hasToken: !!access_token });
      return res.status(400).json({ error: 'user_id and access_token are required' });
    }

    // Threads API에 프로필 조회 요청 (재시도 로직 포함)
    console.log('Fetching Threads profile for user:', user_id);

    // Threads API는 GET 파라미터로 access_token을 받음
    // 'me' 엔드포인트 사용 (더 안정적일 수 있음)
    const apiUrl = `${THREADS_GRAPH_API}/me`;
    const params = {
      fields: 'id,username,threads_profile_picture_url,threads_biography',
      access_token: access_token
    };

    console.log('Request URL:', apiUrl);
    console.log('Request params:', { ...params, access_token: 'REDACTED' });

    // 재시도 로직 (is_transient 에러 대응)
    let lastError: any;
    const maxRetries = 3;
    const retryDelay = 1000; // 1초

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);

        const response = await axios.get(apiUrl, {
          params: params,
          headers: {
            'Accept': 'application/json'
          },
          timeout: 10000 // 10초 타임아웃
        });

        console.log('Profile fetch successful on attempt', attempt);
        return res.status(200).json(response.data);

      } catch (error: any) {
        lastError = error;

        // is_transient 에러인 경우에만 재시도
        const isTransient = error.response?.data?.error?.is_transient === true;

        if (isTransient && attempt < maxRetries) {
          console.log(`Transient error on attempt ${attempt}, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // 재시도하지 않을 에러이거나 마지막 시도인 경우 throw
        throw error;
      }
    }

    // 모든 재시도 실패
    throw lastError;

  } catch (error: any) {
    console.error('Profile fetch failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });

    // Threads API 에러 응답 전달
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Profile fetch failed',
        message: error.response.data?.error?.message || error.response.data?.error_description || error.message,
        details: error.response.data
      });
    }

    // 네트워크 에러 등
    return res.status(500).json({
      error: 'Profile fetch failed',
      message: error.message,
      code: error.code
    });
  }
}
