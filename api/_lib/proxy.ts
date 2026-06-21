import type { VercelRequest, VercelResponse } from '@vercel/node';

// Supabase access token 검증: /auth/v1/user 가 200이면 유효한 로그인 세션.
// (env: VITE_SUPABASE_URL/ANON 은 서버에서도 process.env 로 읽힌다. cron 함수와 동일.)
async function verifyAppToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Supabase env(URL/ANON)가 설정되지 않아 토큰 검증 불가');
    return false;
  }
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch (e) {
    console.error('토큰 검증 요청 실패:', e);
    return false;
  }
}

// 들어온 요청을 provider 실제 API로 그대로 전달하되, 인증 헤더(키)만 서버에서 주입한다.
export async function forward(
  req: VercelRequest,
  res: VercelResponse,
  targetBase: string,
  injectAuth: (headers: Record<string, string>) => void
): Promise<void> {
  // 1) 로그인 검증
  const appToken = req.headers['x-app-token'];
  const ok = await verifyAppToken(Array.isArray(appToken) ? appToken[0] : appToken);
  if (!ok) {
    res.status(401).json({ error: 'unauthorized', message: '로그인이 필요합니다.' });
    return;
  }

  // 2) 대상 URL 구성 (catch-all [...path] + 원본 쿼리스트링)
  const segs = (req.query as Record<string, string | string[]>).path;
  const pathArr = Array.isArray(segs) ? segs : segs ? [segs] : [];
  const path = pathArr.join('/');
  const qIdx = (req.url || '').indexOf('?');
  const qs = qIdx >= 0 ? (req.url as string).slice(qIdx) : '';
  const target = `${targetBase}/${path}${qs}`;

  // 3) 헤더 구성: 민감/홉바이홉 헤더 제거 후 provider 키 주입
  const skip = new Set([
    'host', 'connection', 'content-length', 'accept-encoding',
    'x-app-token', 'authorization', 'x-api-key', 'x-goog-api-key', 'cookie',
  ]);
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (skip.has(k.toLowerCase())) continue;
    if (typeof v === 'string') headers[k] = v;
  }
  if (!headers['content-type']) headers['content-type'] = 'application/json';
  injectAuth(headers);

  // 4) 바디 전달 (JSON API)
  let body: string | undefined;
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    body = typeof req.body === 'string'
      ? req.body
      : req.body != null
        ? JSON.stringify(req.body)
        : undefined;
  }

  // 5) 전달 및 응답 반환 (content-encoding 은 fetch가 이미 디코드하므로 전달하지 않음)
  try {
    const resp = await fetch(target, { method, headers, body });
    const buf = Buffer.from(await resp.arrayBuffer());
    res.status(resp.status);
    const ct = resp.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(buf);
  } catch (e: any) {
    console.error('프록시 전달 실패:', e);
    res.status(502).json({ error: 'bad_gateway', message: e?.message || 'upstream 호출 실패' });
  }
}
