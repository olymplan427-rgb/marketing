import type { VercelRequest, VercelResponse } from '@vercel/node';

// 서버 전용 모듈 (브라우저 import 금지). /api 함수들이 ../lib 에서 import 한다.
// Vite client 코드(import.meta.env 등)를 절대 사용하지 않는다.

// Supabase access token 검증: /auth/v1/user 가 200이면 유효한 로그인 세션.
async function verifyAppToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error('Supabase env(URL/ANON) 미설정 → 토큰 검증 불가');
    return false;
  }
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch (e) {
    console.error('토큰 검증 실패:', e);
    return false;
  }
}

// 들어온 요청을 provider 실제 API로 전달하되 인증 헤더(키)만 서버에서 주입한다.
// vercel.json rewrites가 /api/proxy/<provider>/<path...> → 이 함수로 보내며
// 원본 경로를 ?upstream=<path...> 로 전달한다.
export async function forward(
  req: VercelRequest,
  res: VercelResponse,
  targetBase: string,
  injectAuth: (headers: Record<string, string>) => void
): Promise<void> {
  try {
    // 1) 로그인 검증
    const appToken = req.headers['x-app-token'];
    const ok = await verifyAppToken(Array.isArray(appToken) ? appToken[0] : appToken);
    if (!ok) {
      res.status(401).json({ error: 'unauthorized', message: '로그인이 필요합니다.' });
      return;
    }

    // 2) 대상 URL 구성
    const q = req.query as Record<string, string | string[]>;
    const upstreamRaw = q.upstream;
    const upstream = (Array.isArray(upstreamRaw) ? upstreamRaw[0] : upstreamRaw) || '';
    const extra = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (k === 'upstream' || k === 'path') continue;
      if (Array.isArray(v)) v.forEach((vv) => extra.append(k, vv));
      else if (v != null) extra.append(k, v);
    }
    const extraQs = extra.toString();
    const target = `${targetBase}/${upstream}${extraQs ? `?${extraQs}` : ''}`;

    // 3) 헤더 구성: 민감/홉바이홉 제거 후 provider 키 주입
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

    // 5) 전달 및 응답 반환 (content-encoding은 fetch가 디코드하므로 전달하지 않음)
    const resp = await fetch(target, { method, headers, body });
    const buf = Buffer.from(await resp.arrayBuffer());
    res.status(resp.status);
    const ct = resp.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(buf);
  } catch (e: any) {
    console.error('proxy forward error:', e);
    res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}
