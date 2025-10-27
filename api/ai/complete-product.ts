import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

const clean = (s: string) => s?.replace(/```json|```/g, '').trim();

function heuristicComplete(product: any) {
    const name = product?.name || 'Product';
    const category = product?.category || (/gpu|graphics|rtx|gtx/i.test(name) ? 'GPU' : /cpu|processor|ryzen|intel/i.test(name) ? 'CPU' : /keyboard|keychron|razer|logitech/i.test(name) ? 'Keyboard' : 'Misc');
    const seoTitle = product?.seoTitle || `${name} | ${category} Review & Specs`;
    const seoDescription = product?.seoDescription || `Explore ${name}: key specs, pricing, and quick AI-style summary for faster decisions.`;
    const review = product?.review || `The ${name} is a strong option in the ${category} category. Highlights include reliable build quality, balanced performance, and good value. Check the specifications for precise details and compare with rivals to decide if it fits your build.`;
    const specifications = product?.specifications || '';
    const price = product?.price || '$0.00';
    const brand = product?.brand || product?.name?.split(' ')?.[0] || '';
    return { name, category, seoTitle, seoDescription, review, specifications, price, brand };
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { productUrl, product, productName } = req.body || {};
        if (!product && !productUrl && !productName) return res.status(400).json({ error: 'product or productUrl or productName required' });

        // Path 1: Build from just a product name (no URL)
        if (productName && !productUrl) {
            if (!ai) {
                return res.status(200).json(heuristicComplete({ name: productName }));
            }
            try {
                const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const prompt = `Generate product details for: ${productName}.
Return ONLY JSON with keys: name, brand, category, price (USD like "$XXX.XX"), specifications (comma-separated key: value pairs), review (120-200 words), seoTitle (<=60 chars), seoDescription (<=155 chars).`;
                const resp = await model.generateContent(prompt);
                const text = clean(resp.response.text());
                const data = JSON.parse(text);
                // Ensure required fields exist
                const merged = { name: productName, ...data };
                return res.status(200).json(merged);
            } catch (e: any) {
                console.error('name-only AI error', e?.message || e);
                return res.status(200).json(heuristicComplete({ name: productName }));
            }
        }

        // Path 2: From URL/product (existing logic)
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
            return res.status(200).json(heuristicComplete(product));
        }

        try {
            const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `You complete missing product fields for an e-commerce admin tool. Use the provided data as truth; only fill blanks or obviously wrong values. Be concise and precise.
Return ONLY JSON with keys: name, brand, category, price (USD formatted like "$XXX.XX"), specifications (comma-separated key: value pairs), review (120-200 words, readable paragraphs), seoTitle (<=60 chars), seoDescription (<=155 chars).

Provided product JSON (hints, may be incomplete):\n${JSON.stringify(product || {}, null, 2)}\n
Optional HTML snapshot of the page (may be truncated):\n${html.substring(0, 24000)}\n`;
            const resp = await model.generateContent(prompt);
            const text = clean(resp.response.text());
            const data = JSON.parse(text);
            return res.status(200).json(data);
        } catch (e: any) {
            // On any AI error (e.g., 429 quota), return heuristic completion so UI keeps working
            console.error('complete-product AI error', e?.message || e);
            return res.status(200).json(heuristicComplete(product));
        }
    } catch (e: any) {
        console.error('complete-product error', e);
        return res.status(200).json(heuristicComplete((req.body || {}).product || {}));
    }
}

export const config = { runtime: 'nodejs' };
