/**
 * Threads Long-Lived Token Exchange API
 *
 * Short-Lived Access Token을 Long-Lived Access Token(60일)으로 교환
 * https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions#long-lived-token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const THREADS_TOKEN_URL = 'https://graph.threads.net/access_token';

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
    const { short_lived_token } = req.body;

    if (!short_lived_token) {
      return res.status(400).json({ error: 'short_lived_token is required' });
    }

    // 환경 변수 확인
    const THREADS_APP_SECRET = process.env.VITE_THREADS_APP_SECRET;

    if (!THREADS_APP_SECRET) {
      console.error('Missing Threads app secret');
      return res.status(500).json({ error: 'Threads API credentials not configured' });
    }

    // Threads API에 Long-Lived Token 교환 요청
    console.log('Exchanging short-lived token for long-lived token...');

    const response = await axios.get(THREADS_TOKEN_URL, {
      params: {
        grant_type: 'th_exchange_token',
        client_secret: THREADS_APP_SECRET,
        access_token: short_lived_token
      }
    });

    console.log('Long-lived token exchange successful:', {
      hasAccessToken: !!response.data.access_token,
      expiresIn: response.data.expires_in
    });

    // 성공 응답
    return res.status(200).json({
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in // 60일 (5184000초)
    });

  } catch (error: any) {
    console.error('Long-lived token exchange failed:', error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      error: 'Long-lived token exchange failed',
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data
    });
  }
}
