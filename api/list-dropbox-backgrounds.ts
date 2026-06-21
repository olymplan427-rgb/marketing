
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 헤더 설정
    const allowedOrigins = [
        process.env.PRODUCTION_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null),
        process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
        process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
    ].filter(Boolean) as string[];

    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'CORS preflight successful' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🎨 Dropbox 배경 이미지 목록 조회 시작...');

        // Dropbox 환경변수 확인
        const dropboxRefreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        const dropboxAppKey = process.env.DROPBOX_APP_KEY;
        const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;

        // Note: fetch is global in Node 18+. Adding a check just in case or using globalThis.
        const fetchFn = globalThis.fetch;

        if (!dropboxRefreshToken || !dropboxAppKey || !dropboxAppSecret) {
            console.error('❌ Dropbox 환경변수 누락');
            return res.status(500).json({
                success: false,
                error: 'Dropbox 환경변수가 설정되지 않았습니다.'
            });
        }

        // 리프레시 토큰으로 액세스 토큰 획득
        console.log('🔄 Dropbox 액세스 토큰 갱신 중...');
        const tokenResponse = await fetchFn('https://api.dropboxapi.com/oauth2/token', {
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
            const tokenError = await tokenResponse.text();
            console.error('❌ 토큰 갱신 실패:', tokenError);
            return res.status(500).json({
                success: false,
                error: '토큰 갱신 실패',
                details: tokenError
            });
        }

        const tokenResult = await tokenResponse.json() as any;
        const dropboxAccessToken = tokenResult.access_token;
        console.log('✅ Dropbox 액세스 토큰 갱신 완료');

        // Dropbox /backgrounds/ 폴더 내용 조회
        const folderPath = '/backgrounds';

        const listResponse = await fetchFn('https://api.dropboxapi.com/2/files/list_folder', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dropboxAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: folderPath,
                recursive: false,
                include_deleted: false
            })
        });

        if (!listResponse.ok) {
            const listError = await listResponse.text();
            console.error('❌ 폴더 목록 조회 실패:', listError);
            return res.status(500).json({
                success: false,
                error: '폴더 목록 조회 실패',
                details: listError
            });
        }

        const listResult = await listResponse.json() as any;

        // 이미지 파일만 필터링
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const imageFiles = listResult.entries.filter((entry: any) => {
            if (entry['.tag'] !== 'file') return false;
            const lowerName = entry.name.toLowerCase();
            return imageExtensions.some(ext => lowerName.endsWith(ext));
        });

        // 3개까지만 테스트로... 아니면 전체 다?
        // Base64 변환은 느릴 수 있으므로 병렬 처리 필요
        console.log(`🖼️ 이미지 파일 ${imageFiles.length}개 처리 중...`);

        const backgrounds = await Promise.all(imageFiles.map(async (file: any) => {
            try {
                let shareUrl = null;

                // 1. 공유 링크 생성 (또는 조회)
                const createLinkResponse = await fetchFn('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${dropboxAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        path: file.path_display,
                        settings: {
                            audience: 'public',
                            access: 'viewer',
                            requested_visibility: 'public'
                        }
                    })
                });

                if (createLinkResponse.ok) {
                    const createLinkResult = await createLinkResponse.json() as any;
                    shareUrl = createLinkResult.url;
                } else {
                    const errorText = await createLinkResponse.text();
                    if (errorText.includes('shared_link_already_exists')) {
                        // 기존 링크 조회
                        const listLinksResponse = await fetchFn('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${dropboxAccessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                path: file.path_display,
                                direct_only: true
                            })
                        });

                        if (listLinksResponse.ok) {
                            const listLinksResult = await listLinksResponse.json() as any;
                            const fileLinks = listLinksResult.links.filter((link: any) =>
                                link.url && !link.url.includes('/scl/fo/')
                            );
                            if (fileLinks.length > 0) {
                                shareUrl = fileLinks[0].url;
                            }
                        }
                    }
                }

                if (!shareUrl) return null;

                // 2. 이미지 다운로드 및 Base64 변환 (서버 사이드)
                // 이를 통해 CORS 문제를 완전히 해결
                const rawUrl = shareUrl.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');

                const imageResponse = await fetchFn(rawUrl);
                if (!imageResponse.ok) throw new Error('Download failed');

                const imageBuffer = await imageResponse.arrayBuffer();
                const base64Image = Buffer.from(imageBuffer).toString('base64');
                const contentType = imageResponse.headers.get('content-type') || 'image/png';
                const dataUrl = `data:${contentType};base64,${base64Image}`;

                const displayName = file.name
                    .replace(/^bg[_-]/, '')
                    .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
                    .replace(/[_-]/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');

                return {
                    id: file.id,
                    name: displayName,
                    filename: file.name,
                    path: file.path_display,
                    url: dataUrl, // Base64 Data URL 반환
                    thumbnailUrl: dataUrl,
                    size: file.size,
                    modified: file.client_modified
                };
            } catch (err) {
                console.error(`Error processing ${file.name}:`, err);
                return null;
            }
        }));

        const validBackgrounds = backgrounds.filter(Boolean);
        validBackgrounds.sort((a, b) => a.filename.localeCompare(b.filename));

        return res.status(200).json({
            success: true,
            data: {
                backgrounds: validBackgrounds,
                folderPath,
                total: validBackgrounds.length
            }
        });

    } catch (error: any) {
        console.error('❌ List Dropbox Backgrounds Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
