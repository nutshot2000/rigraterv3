export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { productUrl } = req.body || {};
        if (!productUrl) return res.status(400).json({ error: 'productUrl is required' });

        const page = await fetch(productUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
        });
        const html = await page.text();

        const urls = new Set<string>();

        // 1) data-old-hires attribute on main image
        const oldHiresMatches = [...html.matchAll(/data-old-hires\s*=\s*"(https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))"/gi)];
        oldHiresMatches.forEach(m => urls.add(m[1]));

        // 2) data-a-dynamic-image JSON map {"url":[w,h],...}
        const dynAttr = [...html.matchAll(/data-a-dynamic-image\s*=\s*"([\s\S]*?)"/gi)];
        for (const m of dynAttr) {
            try {
                const jsonText = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
                const obj = JSON.parse(jsonText);
                Object.keys(obj).forEach(k => urls.add(k));
            } catch {}
        }

        // 3) hiRes keys in embedded JSON
        const hiResMatches = [...html.matchAll(/\"hiRes\"\s*:\s*\"(https?:\\\/[^"]+?\.(?:jpg|jpeg|png|webp))\"/gi)];
        hiResMatches.forEach(m => {
            const u = m[1].replace(/\\\//g, '/');
            urls.add(u);
        });

        // 4) General <img src> and srcset fallbacks
        const imgSrcRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi;
        (html.match(imgSrcRegex) || []).forEach(u => urls.add(u));

        // Amazon-specific normalization: keep only Amazon CDN images first
        const primary: string[] = [];
        const secondary: string[] = [];
        for (const u of urls) {
            if (/media-amazon\.com\/images\/I\//i.test(u) || /ssl-images-amazon\.com\/images\/I\//i.test(u)) primary.push(u);
            else secondary.push(u);
        }
        const ordered = [...primary, ...secondary];

        // Normalize Amazon variants
        const normalized = new Set<string>();
        for (const u of ordered) {
            if (/amazon\.com\/images\/I\//i.test(u)) {
                normalizeAmazonUrl(u).forEach(v => normalized.add(v));
            } else {
                normalized.add(u);
            }
        }

        const out = Array.from(normalized).slice(0, 40);
        return res.status(200).json({ images: out });
    } catch (e: any) {
        console.error('extract-images error', e);
        return res.status(500).json({ error: 'failed to extract images', details: e?.message || String(e) });
    }
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

function normalizeAmazonUrl(url: string): string[] {
    const variants: string[] = [];
    const base = url
        .replace(/\._AC_[A-Z]{2}\d+_,?/gi, '')
        .replace(/\._AC_SL\d+_/i, '')
        .replace(/\._SL\d+_/i, '')
        .replace(/\._SX\d+_/i, '')
        .replace(/\._SY\d+_/i, '')
        .replace(/\._UX\d+_/i, '')
        .replace(/\._UY\d+_/i, '')
        .replace(/\._SS\d+_/i, '')
        .replace(/\._SR\d+,\d+_/i, '')
        .replace(/\._CR\d+,\d+,\d+,\d+_/i, '');
    variants.push(base);
    const sized = [1500, 1200, 1100, 1000, 800, 700, 600, 522, 500].map(n => base.replace(/(\.[a-z]+)$/i, `._SL${n}_$1`));
    sized.forEach(v => variants.push(v));
    return unique(variants);
}

export const config = { runtime: 'nodejs' };
