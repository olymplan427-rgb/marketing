/**
 * Threads Deauthorize Callback
 * 사용자가 앱 권한을 제거할 때 Meta가 호출하는 Vercel Serverless Function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // GET 요청: Meta에서 URL 검증용
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Deauthorize endpoint is active',
      status: 'ok'
    });
  }

  // POST 요청: 실제 권한 제거 알림
  if (req.method === 'POST') {
    try {
      const { signed_request } = req.body;

      if (!signed_request) {
        return res.status(400).json({
          error: 'Missing signed_request parameter'
        });
      }

      // 페이로드 디코딩
      const payload = parseSignedRequest(signed_request);

      if (!payload) {
        return res.status(400).json({
          error: 'Invalid signed_request'
        });
      }

      const { user_id, issued_at } = payload;

      console.log(`Deauthorize notification received:`, {
        user_id,
        issued_at: new Date(issued_at * 1000).toISOString()
      });

      // TODO: 권한 제거 처리
      // 1. 해당 사용자의 액세스 토큰 무효화
      // 2. Supabase에 권한 제거 로그 기록
      // 3. 필요시 사용자에게 이메일 알림

      return res.status(200).json({
        success: true,
        message: 'Deauthorization processed'
      });

    } catch (error) {
      console.error('Deauthorize error:', error);
      return res.status(500).json({
        error: 'Failed to process deauthorization'
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
}

/**
 * Meta의 signed_request 파싱
 */
function parseSignedRequest(signedRequest: string): any {
  try {
    const [encodedSignature, payload] = signedRequest.split('.');

    if (!payload) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse signed_request:', error);
    return null;
  }
}
