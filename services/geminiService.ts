
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProductInfo, AISuggestedProduct, BlogPost, ComparisonDoc } from '../types';
import { FALLBACK_IMAGE_URL } from '../constants';

// Support multiple env shapes; Vite injects from vite.config define()
const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
export const isAIEnabled = Boolean(GEMINI_KEY);

const ai = new GoogleGenerativeAI(GEMINI_KEY);

/**
 * Cleans the raw text response from the AI to extract a valid JSON string.
 * It removes markdown code fences (```json ... ```) that the AI might add.
 * @param rawText The raw string response from the Gemini API.
 * @returns A clean string ready for JSON.parse().
 */
const cleanJsonString = (rawText: string): string => {
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return rawText.trim();
};

const isLikelyImageUrl = (url: string): boolean => {
    try {
        const u = new URL(url);
        const pathname = u.pathname.toLowerCase();
        return (
            (u.protocol === 'http:' || u.protocol === 'https:') &&
            (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.png') || pathname.endsWith('.webp') || pathname.endsWith('.gif'))
        );
    } catch {
        return false;
    }
};

/**
 * Sanitizes and validates the AI-generated product info.
 */
export function sanitizeProductInfo(input: unknown): AIProductInfo {
    let parsed: any = input;
    try {
        if (typeof input === 'string') {
            parsed = JSON.parse(input as string);
        }
    } catch {
        parsed = {};
    }

    const out: any = { ...parsed };

    // Coerce required, with sensible defaults
    out.name = typeof out.name === 'string' && out.name.trim() ? out.name.trim() : 'Unknown Product';
    out.category = typeof out.category === 'string' && out.category.trim() ? out.category.trim() : 'Misc';

    const priceRaw = (out.price || '').toString().trim();
    out.price = priceRaw ? (priceRaw.startsWith('$') ? priceRaw : `$${priceRaw}`) : '$0.00';

    // Affiliate link best-effort
    try {
        const link = (out.affiliateLink || '').toString().trim();
        const u = new URL(link);
        out.affiliateLink = u.protocol === 'http:' || u.protocol === 'https:' ? link : '#';
    } catch {
        out.affiliateLink = '#';
    }

    // Images: prefer imageUrls array; fall back to imageUrl
    if (Array.isArray(out.imageUrls)) {
        out.imageUrls = out.imageUrls.filter((x: any) => typeof x === 'string' && x.trim());
    } else if (typeof out.imageUrl === 'string' && out.imageUrl.trim()) {
        out.imageUrls = [out.imageUrl.trim()];
    } else {
        out.imageUrls = [];
    }
    out.imageUrl = out.imageUrls[0] || FALLBACK_IMAGE_URL;

    out.review = typeof out.review === 'string' ? out.review : '';
    out.specifications = typeof out.specifications === 'string' ? out.specifications : '';
    out.brand = typeof out.brand === 'string' ? out.brand : undefined;

    return out as AIProductInfo;
}

export const generateProductInfo = async (productName: string): Promise<AIProductInfo> => {
    try {
        const useServerless = (process.env.SERVERLESS_AI || '').trim();
        if (useServerless) {
            const resp = await fetch('/api/ai/product-info', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName })
            });
            if (!resp.ok) throw new Error('Serverless AI error');
            const data: any = await resp.json();
            const sanitized = sanitizeProductInfo(data);
            // Fill missing name from the user input, if needed
            if (!sanitized.name || sanitized.name === 'Unknown Product') sanitized.name = productName;
            return sanitized;
        }
        if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const response = await model.generateContent(
            `You are an expert affiliate marketer specializing in PC components. Given the product name "${productName}", generate a compelling product review, a list of key technical specifications (as a single comma-separated string), a realistic current market price in USD (e.g., '$XXX.XX'), the product BRAND (manufacturer), and a standard Amazon affiliate link. Then, find a high-quality, official product image URL. CRITICAL: The URL must point directly to an image file (e.g., ending in .jpg, .webp, or .png), not an HTML page. Respond with ONLY a JSON object: {"review","price","affiliateLink","imageUrl","specifications","brand"}.`
        );
        const jsonText = cleanJsonString(response.response.text());
        const productInfo: any = JSON.parse(jsonText);
        const sanitized = sanitizeProductInfo(productInfo);
        if (!sanitized.name || sanitized.name === 'Unknown Product') sanitized.name = productName;
        return sanitized;

    } catch (error) {
        console.error("Error generating product info:", error);
        throw new Error("Failed to generate product info from AI.");
    }
};

export const suggestNewProducts = async (category: string, count: number = 3, existingNames: string[] = []): Promise<AISuggestedProduct[]> => {
    try {
        const serverless = (process.env.SERVERLESS_AI || '').trim();
        if (serverless) {
            const resp = await fetch(`${serverless}/suggestNewProducts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, count, existingNames })
            });
            if (!resp.ok) throw new Error('Serverless AI error');
            const data: AISuggestedProduct[] = await resp.json();
            return data.map(s => ({
                ...s,
                imageUrl: isLikelyImageUrl((s.imageUrl || '').trim()) ? (s.imageUrl || '').trim() : FALLBACK_IMAGE_URL,
            }));
        }
        if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const response = await model.generateContent(
            `You are a PC hardware market analyst. Suggest ${count} new and popular products in the "${category}" category. Avoid duplicates and near-duplicates of: ${existingNames.slice(0,200).join('; ')}. Return ONLY a JSON array: [{"name","category","imageUrls"}].`
        );
        const jsonText = cleanJsonString(response.response.text());
        const suggestions: AISuggestedProduct[] = JSON.parse(jsonText);
        return suggestions.map(s => ({
            ...s,
            imageUrl: isLikelyImageUrl((s.imageUrl || '').trim()) ? (s.imageUrl || '').trim() : FALLBACK_IMAGE_URL,
        }));

    } catch (error) {
        console.error("Error suggesting new products:", error);
        throw new Error("Failed to get product suggestions from AI.");
    }
};

export const generateBlogPost = async (title: string, outline?: string): Promise<Omit<BlogPost, 'id' | 'createdAt'>> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/generateBlogPost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, outline }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        return await resp.json();
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(`Write an SEO-optimized blog post about: ${title}. ${outline ? `Outline: ${outline}.` : ''} Return ONLY JSON: {title, slug, coverImageUrl, summary, content, tags}`);
    const jsonText = cleanJsonString(response.response.text());
    const post = JSON.parse(jsonText);
    return post;
};

export const generateComparison = async (title: string, products: { name: string; specs: string }[]): Promise<Omit<ComparisonDoc, 'id' | 'createdAt'>> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/generateComparison`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, products }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        return await resp.json();
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(`Create a detailed comparison titled "${title}" of these products and their specs: ${JSON.stringify(products)}. Return ONLY JSON: {title, productIds, content, specDiffSummary}`);
    const jsonText = cleanJsonString(response.response.text());
    const doc = JSON.parse(jsonText);
    return doc;
};

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export const chatWithAI = async (
    messages: ChatMessage[],
    opts?: { context?: string }
): Promise<string> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, context: opts?.context || '' })
        });
        if (!resp.ok) throw new Error('Serverless AI error');
        const data = await resp.json();
        return String(data.text || data.message || '');
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const system = `You are an expert PC hardware assistant for an affiliate site. Provide accurate, concise answers that help select, compare, and recommend PC parts.`;
    const context = opts?.context ? `\nContext:\n${opts.context}` : '';
    const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `${system}${context}\n\nConversation so far:\n${history}\n\nAssistant:`;
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(prompt);
    return response.response.text();
};

export const generateProductSEO = async (name: string, category: string, review: string): Promise<{ seoTitle: string; seoDescription: string }> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/generateProductSEO`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, review }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        return await resp.json();
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(`Create an SEO title (<=60 chars) and meta description (<=155 chars) for a product page. Product name: ${name}. Category: ${category}. Summary: ${review}. Return JSON {"seoTitle","seoDescription"}.`);
    const jsonText = cleanJsonString(response.response.text());
    return JSON.parse(jsonText);
};

export const suggestRivals = async (name: string, specifications: string, count: number = 2): Promise<string[]> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/suggestRivals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, specifications, count }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(`Suggest ${count} direct rival product names for: ${name}. Specs: ${specifications}. Focus on same class and price tier. Return ONLY a JSON array of strings (names).`);
    const jsonText = cleanJsonString(response.response.text());
    const arr = JSON.parse(jsonText);
    return Array.isArray(arr) ? arr : [];
};

export const extractProductsFromText = async (text: string): Promise<string[]> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/extractProducts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const response = await model.generateContent(`Extract a list of PC product names from the following text. Include model identifiers. Return ONLY a JSON array of strings. Text: ${text}`);
    const jsonText = cleanJsonString(response.response.text());
    const arr = JSON.parse(jsonText);
    return Array.isArray(arr) ? arr : [];
};
