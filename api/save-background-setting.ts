
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    const allowedOrigins = [
        'https://ai-blog-generator-yogijogi99.vercel.app',
        process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean) as string[];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).json({ message: 'OK' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { backgroundUrl } = req.body;
        if (!backgroundUrl) {
            return res.status(400).json({ success: false, error: 'backgroundUrl is required' });
        }

        const airtableToken = process.env.AIRTABLE_API_TOKEN;
        const baseId = process.env.AIRTABLE_BASE_ID;
        // User provided specific table ID for settings/status update: tblEzh2p9vhOr0BJd
        const settingsTableId = 'tblEzh2p9vhOr0BJd';

        if (!airtableToken || !baseId) {
            return res.status(500).json({ success: false, error: 'Airtable Env Missing' });
        }

        const fetchFn = globalThis.fetch;

        // 소스 코드 로직: 'current_background_url' 키를 가진 레코드를 찾아 업데이트
        // 사용자 요청: "선택된 배경 이미지는 에어테이블 ... 값을 변경해서 상태값을 바꿔 준다."
        // 해석: 소스와 동일하게 'current_background_url' 세팅값을 변경하는 것으로 간주.
        // 또는 특정 'Status' 컬럼을 바꾸는 것일 수도 있음. 
        // 하지만 배경 '선택'이므로 전역 설정(Setting)을 바꾸는 것이 논리적임.

        // 1. 기존 설정 레코드 검색
        const filterFormula = encodeURIComponent("{Setting Key} = 'current_background_url'");
        const searchUrl = `https://api.airtable.com/v0/${baseId}/${settingsTableId}?filterByFormula=${filterFormula}`;

        const searchRes = await fetchFn(searchUrl, {
            headers: { 'Authorization': `Bearer ${airtableToken}` }
        });

        if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.statusText}`);

        const searchData = await searchRes.json() as any;
        const records = searchData.records || [];

        let result;

        if (records.length > 0) {
            // Update
            const recordId = records[0].id;
            const updateUrl = `https://api.airtable.com/v0/${baseId}/${settingsTableId}/${recordId}`;
            const updateRes = await fetchFn(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${airtableToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Setting Value': backgroundUrl
                    }
                })
            });
            if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.statusText}`);
            result = await updateRes.json();
        } else {
            // Create
            const createUrl = `https://api.airtable.com/v0/${baseId}/${settingsTableId}`;
            const createRes = await fetchFn(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${airtableToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Setting Key': 'current_background_url',
                        'Setting Value': backgroundUrl
                    }
                })
            });
            if (!createRes.ok) throw new Error(`Create failed: ${createRes.statusText}`);
            result = await createRes.json();
        }

        return res.status(200).json({
            success: true,
            data: result,
            message: 'Background setting saved'
        });

    } catch (e: any) {
        console.error('Error saving background setting:', e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
