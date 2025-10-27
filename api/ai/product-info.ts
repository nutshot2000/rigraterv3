import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProductInfo } from '../../types';

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
if (!GEMINI_KEY) {
    console.warn('GEMINI_API_KEY is not set; AI extraction will be skipped and fallback parser used.');
}

const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

const cleanJsonString = (rawText: string): string => {
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) return match[1].trim();
    return rawText.trim();
};

function extractMeta(html: string, name: string, attr: 'property' | 'name' = 'property'): string | undefined {
    const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
    const m = html.match(re);
    return m ? m[1] : undefined;
}

function extractJsonLd(html: string): any | undefined {
    try {
        const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        for (const s of scripts) {
            const txt = s[1];
            const json = JSON.parse(txt);
            if (json['@type'] === 'Product' || (Array.isArray(json['@graph']) && json['@graph'].some((n: any) => n['@type'] === 'Product'))) {
                return json;
            }
        }
    } catch {}
    return undefined;
}

function firstNonEmpty(...vals: (string | undefined)[]): string | undefined {
    return vals.find(v => typeof v === 'string' && v.trim().length > 0);
}

function fallbackParse(html: string, url: string) {
    const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title', 'name');
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image', 'name');
    const desc = extractMeta(html, 'og:description') || extractMeta(html, 'description', 'name');
    const jsonld = extractJsonLd(html);

    // Try to derive brand and price from JSON-LD
    let brand: string | undefined;
    let price: string | undefined;
    let name = title;
    if (jsonld) {
        try {
            const product = Array.isArray(jsonld['@graph']) ? jsonld['@graph'].find((n: any) => n['@type'] === 'Product') : jsonld;
            if (product) {
                name = firstNonEmpty(product.name, name);
                brand = typeof product.brand === 'string' ? product.brand : (product.brand?.name);
                const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                const amt = offer?.price || offer?.priceSpecification?.price || offer?.price || undefined;
                const curr = offer?.priceCurrency || 'USD';
                if (amt) {
                    const n = parseFloat(String(amt));
                    price = isFinite(n) ? (curr === 'USD' ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`) : undefined;
                }
            }
        } catch {}
    }

    // Derive category heuristic from title
    const category = /gpu|graphics|rtx|gtx/i.test(title || '') ? 'GPU'
        : /cpu|processor|ryzen|core i\d/i.test(title || '') ? 'CPU'
        : /motherboard|z\d{3}|b\d{3}|x\d{3}/i.test(title || '') ? 'Motherboard'
        : /keyboard|keychron|razer|logitech/i.test(title || '') ? 'Keyboard'
        : 'Misc';

    const imageUrls = image ? [image] : [];

    return {
        name: name || 'Product from URL',
        brand,
        category,
        price: price || '$0.00',
        imageUrls,
        imageUrl: image || '',
        affiliateLink: url,
        review: desc || '',
        specifications: '',
        slug: (name || 'product').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-'),
        seoTitle: name || '',
        seoDescription: desc || ''
    };
}

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return new Response(JSON.stringify({ error: 'productUrl is required' }), { status: 400 });
        }

        const pageResponse = await fetch(productUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }
        });
        const html = await pageResponse.text();

        // If AI key missing, return fallback parse immediately
        if (!ai) {
            const basic = fallbackParse(html, productUrl);
            return new Response(JSON.stringify(basic), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Try AI extraction, fall back to meta parsing if anything fails
        try {
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You extract structured product data from HTML. Return ONLY valid JSON with keys: name, brand, category, price, imageUrls (array), review, specifications, affiliateLink, slug, seoTitle, seoDescription. HTML:\n${html.substring(0, 30000)}`;
            const result = await model.generateContent(prompt);
            const jsonText = cleanJsonString(result.response.text());
            const productInfo = JSON.parse(jsonText);
            return new Response(JSON.stringify(productInfo), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            const basic = fallbackParse(html, productUrl);
            return new Response(JSON.stringify(basic), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

    } catch (error: any) {
        console.error('Error in product-info API:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error?.message || String(error) }), { status: 500 });
    }
};

export const config = {
  runtime: 'nodejs18.x',
};
