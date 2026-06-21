/**
 * Threads OAuth Token Exchange API
 *
 * Authorization Code를 Access Token으로 교환하는 서버사이드 엔드포인트
 * CORS 문제를 해결하기 위해 백엔드에서 토큰 교환 처리
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // 환경 변수 확인
    const THREADS_APP_ID = process.env.VITE_THREADS_APP_ID;
    const THREADS_APP_SECRET = process.env.VITE_THREADS_APP_SECRET;
    const THREADS_REDIRECT_URI = process.env.VITE_THREADS_REDIRECT_URI;

    if (!THREADS_APP_ID || !THREADS_APP_SECRET || !THREADS_REDIRECT_URI) {
      console.error('Missing Threads credentials:', {
        hasAppId: !!THREADS_APP_ID,
        hasSecret: !!THREADS_APP_SECRET,
        hasRedirect: !!THREADS_REDIRECT_URI
      });
      return res.status(500).json({ error: 'Threads API credentials not configured' });
    }

    // Threads API에 토큰 교환 요청
    console.log('Exchanging code for token...');
    console.log('Request config:', {
      url: THREADS_TOKEN_URL,
      hasCode: !!code,
      hasAppId: !!THREADS_APP_ID,
      hasSecret: !!THREADS_APP_SECRET,
      redirectUri: THREADS_REDIRECT_URI
    });

    const response = await axios.post(THREADS_TOKEN_URL,
      new URLSearchParams({
        client_id: THREADS_APP_ID!,
        client_secret: THREADS_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: THREADS_REDIRECT_URI!,
        code: code
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Token exchange successful:', {
      hasAccessToken: !!response.data.access_token,
      hasUserId: !!response.data.user_id
    });

    // 성공 응답
    return res.status(200).json({
      access_token: response.data.access_token,
      user_id: response.data.user_id,
      expires_in: response.data.expires_in
    });

  } catch (error: any) {
    console.error('Token exchange failed:', error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      error: 'Token exchange failed',
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data
    });
  }
}
