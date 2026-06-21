import type { VercelRequest, VercelResponse } from '@vercel/node';
import { forward } from '../../_lib/proxy';

export const config = { maxDuration: 60 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  return forward(req, res, 'https://api.openai.com', (headers) => {
    headers['authorization'] = `Bearer ${process.env.OPENAI_API_KEY || ''}`;
  });
}
