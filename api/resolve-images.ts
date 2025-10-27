export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { urls } = req.body || {};
        if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'urls must be a non-empty array' });

        const testHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        };

        const makeVariants = (u: string): string[] => {
            const m = u.match(/^(.*\/images\/I\/[^.]+)(\.[a-z]+)$/i);
            const ext = m ? m[2] : (u.match(/\.[a-z]+$/i)?.[0] || '.jpg');
            const base = m ? m[1] : u.replace(/\.[a-z]+$/i, '');
            const tokens = [
                '',
                '._AC_SX679_', '._AC_SL1500_', '._AC_SL1000_',
                '._SL1500_', '._SL1200_', '._SL1000_', '._SL800_', '._SL500_',
                '._SY879_', '._SX522_',
            ];
            const variants = tokens.map(t => (m ? `${base}${t}${ext}` : `${base}${t}`));
            // include original URL first
            if (!variants.includes(u)) variants.unshift(u);
            return Array.from(new Set(variants));
        };

        const results: string[] = [];
        for (const url of urls as string[]) {
            const variants = makeVariants(url);
            let found: string | null = null;
            for (const v of variants) {
                try {
                    const r = await fetch(v, { method: 'HEAD', headers: testHeaders });
                    const ok = r.ok && (r.headers.get('content-type') || '').startsWith('image/');
                    if (ok) { found = v; break; }
                    // Some hosts reject HEAD; fallback to tiny GET
                    if (r.status === 405 || r.status === 403) {
                        const g = await fetch(v, { method: 'GET', headers: testHeaders });
                        if (g.ok && (g.headers.get('content-type') || '').startsWith('image/')) { found = v; break; }
                    }
                } catch {}
            }
            if (found) results.push(found);
        }

        return res.status(200).json({ valid: results });
    } catch (e: any) {
        console.error('resolve-images error', e);
        return res.status(500).json({ error: 'failed to resolve images', details: e?.message || String(e) });
    }
}

export const config = { runtime: 'nodejs' };
