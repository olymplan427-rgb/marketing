/**
 * Threads Data Deletion Callback
 * Meta의 데이터 삭제 요청을 처리하는 Vercel Serverless Function
 *
 * GDPR 및 개인정보 보호 규정 준수를 위해 필수
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // GET 요청: Meta에서 URL 검증용
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Data deletion endpoint is active',
      status: 'ok'
    });
  }

  // POST 요청: 실제 데이터 삭제 요청
  if (req.method === 'POST') {
    try {
      const { signed_request } = req.body;

      // Meta의 signed_request 파싱 (실제 구현에서는 검증 필요)
      // 형식: encoded_signature.payload
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

      console.log(`Data deletion request received:`, {
        user_id,
        issued_at: new Date(issued_at * 1000).toISOString()
      });

      // TODO: 실제 데이터 삭제 로직
      // 1. Supabase에서 해당 사용자의 Threads 관련 데이터 삭제
      // 2. 로컬 스토리지는 클라이언트에서 관리되므로 서버에서는 처리 불필요

      // 삭제 확인 URL 생성 (Meta가 확인용으로 사용)
      const confirmationCode = generateConfirmationCode(user_id);
      const statusUrl = `${req.headers.origin || 'https://your-domain.vercel.app'}/deletion-status?code=${confirmationCode}`;

      // Meta에 응답
      return res.status(200).json({
        url: statusUrl,
        confirmation_code: confirmationCode
      });

    } catch (error) {
      console.error('Data deletion error:', error);
      return res.status(500).json({
        error: 'Failed to process deletion request'
      });
    }
  }

  // 다른 HTTP 메서드는 허용하지 않음
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

    // Base64 URL 디코딩
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse signed_request:', error);
    return null;
  }
}

/**
 * 삭제 확인 코드 생성
 */
function generateConfirmationCode(userId: string): string {
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}-${timestamp}`).toString('base64url');
  return hash.substring(0, 16);
}
