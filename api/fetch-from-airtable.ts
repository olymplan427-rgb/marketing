
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더 설정
    const allowedOrigins = [
        process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
        'https://ai-blog-generator-yogijogi99.vercel.app'
    ].filter(Boolean) as string[];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'CORS preflight successful' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { limit = 20, filterUnprocessed = true } = req.body;

        if (!process.env.AIRTABLE_API_TOKEN || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_TABLE_ID) {
            throw new Error('필수 환경변수 미설정');
        }

        const tableNameOrId = process.env.SOURCE_AIRTABLE_TABLE_ID || process.env.AIRTABLE_TABLE_ID;
        let apiUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableNameOrId)}?maxRecords=${limit}&sort%5B0%5D%5Bfield%5D=Created+At&sort%5B0%5D%5Bdirection%5D=desc`;

        if (filterUnprocessed) {
            apiUrl += `&filterByFormula=%7BStatus%7D%3D'발행+전'`;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
            }
        });

        if (!response.ok) {
            throw new Error('Airtable 데이터 조회 실패');
        }

        const data = await response.json();
        return res.status(200).json({
            success: true,
            data: {
                records: data.records.map((r: any) => ({
                    id: r.id,
                    question: r.fields.Question,
                    caption: r.fields.Caption,
                    createdAt: r.fields['Created At'],
                    processed: r.fields.Status !== '발행 전'
                }))
            }
        });

    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
