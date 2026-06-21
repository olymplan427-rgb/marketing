import type { VercelRequest, VercelResponse } from '@vercel/node';

// 자립형 함수 (상대경로 import 금지 — Vercel이 번들에 포함하지 않아 크래시함).
export const config = { maxDuration: 60 };

async function verifyAppToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const appToken = req.headers['x-app-token'];
    const ok = await verifyAppToken(Array.isArray(appToken) ? appToken[0] : appToken);
    if (!ok) {
      res.status(401).json({ error: 'unauthorized', message: '로그인이 필요합니다.' });
      return;
    }

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
    const target = `https://api.anthropic.com/${upstream}${extraQs ? `?${extraQs}` : ''}`;

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
    headers['x-api-key'] = process.env.ANTHROPIC_API_KEY || '';
    if (!headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01';

    const method = (req.method || 'GET').toUpperCase();
    let body: string | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : req.body != null ? JSON.stringify(req.body) : undefined;
    }

    const resp = await fetch(target, { method, headers, body });
    res.status(resp.status);
    const ct = resp.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    if (!resp.body) { res.end(); return; }
    // 응답을 버퍼링 없이 그대로 흘려보냄(스트리밍/SSE 지원) → 긴 생성의 게이트웨이 타임아웃 완화
    const { Readable } = await import('node:stream');
    await new Promise<void>((resolve, reject) => {
      Readable.fromWeb(resp.body as any).pipe(res).on('finish', resolve).on('error', reject);
    });
  } catch (e: any) {
    console.error('proxy-anthropic error:', e);
    res.status(500).json({ error: 'proxy_error', message: e?.message || String(e) });
  }
}
