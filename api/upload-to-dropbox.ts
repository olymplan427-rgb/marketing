
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더 설정
    const allowedOrigins = [
        process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
        process.env.PRODUCTION_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    ].filter(Boolean) as string[];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'CORS preflight successful' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, filename, folderPath } = req.body;

        const dropboxRefreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        const dropboxAppKey = process.env.DROPBOX_APP_KEY;
        const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;

        if (!dropboxRefreshToken || !dropboxAppKey || !dropboxAppSecret) {
            return res.status(400).json({ error: 'Dropbox 환경변수 미설정' });
        }

        // Refresh token
        const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${dropboxAppKey}:${dropboxAppSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                'grant_type': 'refresh_token',
                'refresh_token': dropboxRefreshToken
            }).toString()
        });

        if (!tokenResponse.ok) {
            throw new Error('Dropbox 토큰 갱신 실패');
        }

        const { access_token } = await tokenResponse.json();

        const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        const binaryData = Buffer.from(base64Data, 'base64');
        const uploadPath = folderPath ? `${folderPath}/${filename}` : `/Drawer_instagram/${filename}`;

        const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    path: uploadPath,
                    mode: 'add',
                    autorename: true,
                    mute: false
                })
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            throw new Error('Dropbox 업로드 실패');
        }

        const uploadResult = await uploadResponse.json();

        // Create shared link
        let shareUrl = '';
        const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: uploadResult.path_display })
        });

        if (shareResponse.ok) {
            const shareResult = await shareResponse.json();
            shareUrl = shareResult.url.replace('?dl=0', '?dl=1&raw=1');
        }

        return res.status(200).json({
            success: true,
            dropbox: {
                ...uploadResult,
                shareUrl
            }
        });

    } catch (error: any) {
        console.error('❌ Dropbox 오류:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
