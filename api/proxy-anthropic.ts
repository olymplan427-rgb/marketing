import type { VercelRequest, VercelResponse } from '@vercel/node';
import { forward } from './_lib/proxy';

export const config = { maxDuration: 60 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  return forward(req, res, 'https://api.anthropic.com', (headers) => {
    headers['x-api-key'] = process.env.ANTHROPIC_API_KEY || '';
    if (!headers['anthropic-version']) headers['anthropic-version'] = '2023-06-01';
  });
}
