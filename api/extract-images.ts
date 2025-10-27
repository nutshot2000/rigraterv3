import type { VercelRequest, VercelResponse } from '@vercel/node';

function unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

function normalizeAmazonUrl(url: string): string[] {
    // Generate candidate variants by removing size tokens like ._SL1500_ or ._AC_SL1500_
    const variants: string[] = [];
    const base = url
        .replace(/\._AC_SL\d+_/i, '')
        .replace(/\._SL\d+_/i, '')
        .replace(/\._SX\d+_/i, '')
        .replace(/\._UX\d+_/i, '')
        .replace(/\._UY\d+_/i, '')
        .replace(/\._SS\d+_/i, '')
        .replace(/\._SR\d+,\d+_/i, '')
        .replace(/\._CR\d+,\d+,\d+,\d+_/i, '');
    variants.push(base);
    // Also offer a reasonable size variant
    const sized1000 = base.replace(/(\.[a-z]+)$/i, '._SL1000_$1');
    const sized500 = base.replace(/(\.[a-z]+)$/i, '._SL500_$1');
    variants.push(sized1000, sized500);
    return unique(variants);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { productUrl } = req.body || {};
        if (!productUrl) return res.status(400).json({ error: 'productUrl is required' });

        const page = await fetch(productUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
        });
        const html = await page.text();

        // Extract all direct image URLs
        const urls = new Set<string>();
        const imgSrcRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi;
        const matches = html.match(imgSrcRegex) || [];
        for (const m of matches) {
            if (/m\.media-amazon\.com\/images\/I\//i.test(m) || /images-na\.ssl-images-amazon\.com\//i.test(m)) {
                normalizeAmazonUrl(m).forEach(u => urls.add(u));
            } else if (!/sprite|icon|logo|transparent|placeholder/i.test(m)) {
                urls.add(m);
            }
        }

        const out = Array.from(urls).slice(0, 20);
        return res.status(200).json({ images: out });
    } catch (e: any) {
        console.error('extract-images error', e);
        return res.status(500).json({ error: 'failed to extract images', details: e?.message || String(e) });
    }
}

export const config = { runtime: 'nodejs' };
