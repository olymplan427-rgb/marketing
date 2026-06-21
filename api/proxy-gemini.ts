import type { VercelRequest, VercelResponse } from '@vercel/node';
import { forward } from './_lib/proxy';

export const config = { maxDuration: 60 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  return forward(req, res, 'https://generativelanguage.googleapis.com', (headers) => {
    headers['x-goog-api-key'] = process.env.GEMINI_API_KEY || '';
  });
}
