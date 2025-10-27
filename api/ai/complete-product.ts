import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

const clean = (s: string) => s?.replace(/```json|```/g, '').trim();

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { productUrl, product } = req.body || {};
        if (!product && !productUrl) return res.status(400).json({ error: 'product or productUrl required' });

        let html = '';
        try {
            if (productUrl) {
                const page = await fetch(productUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' } });
                html = await page.text();
            }
        } catch (e) {
            // ignore fetch errors; proceed with available data
        }

        if (!ai) {
            // Fallback: minimal completion heuristics
            const name = product?.name || 'Product';
            const category = product?.category || (/gpu|graphics|rtx|gtx/i.test(name) ? 'GPU' : /cpu|processor|ryzen|intel/i.test(name) ? 'CPU' : 'Misc');
            const seoTitle = product?.seoTitle || `${name} | ${category} Review & Specs`;
            const seoDescription = product?.seoDescription || `Explore ${name}: key specs, pricing, and quick review.`;
            const review = product?.review || `Quick take on ${name}: solid value in the ${category} category. See specs and pricing below.`;
            return res.status(200).json({ name, category, seoTitle, seoDescription, review, specifications: product?.specifications || '' });
        }

        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You complete missing product fields for an e-commerce admin tool. Use the provided data as truth; only fill blanks or obviously wrong values. Be concise and precise.
Return ONLY JSON with keys: name, brand, category, price (USD formatted like "$XXX.XX"), specifications (comma-separated key: value pairs), review (120-200 words, readable paragraphs), seoTitle (<=60 chars), seoDescription (<=155 chars).

Provided product JSON (hints, may be incomplete):\n${JSON.stringify(product || {}, null, 2)}\n
Optional HTML snapshot of the page (may be truncated):\n${html.substring(0, 28000)}\n`;
        const resp = await model.generateContent(prompt);
        const text = clean(resp.response.text());
        const data = JSON.parse(text);
        return res.status(200).json(data);
    } catch (e: any) {
        console.error('complete-product error', e);
        return res.status(500).json({ error: 'failed to complete product', details: e?.message || String(e) });
    }
}

export const config = { runtime: 'nodejs' };
