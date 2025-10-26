
import { GoogleGenAI } from "@google/genai";
import { AIProductInfo, AISuggestedProduct, BlogPost, ComparisonDoc } from '../types';
import { FALLBACK_IMAGE_URL } from '../constants';

// Support multiple env shapes; Vite injects from vite.config define()
const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
export const isAIEnabled = Boolean(GEMINI_KEY);

const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

/**
 * Cleans the raw text response from the AI to extract a valid JSON string.
 * It removes markdown code fences (```json ... ```) that the AI might add.
 * @param rawText The raw string response from the Gemini API.
 * @returns A clean string ready for JSON.parse().
 */
const cleanJsonString = (rawText: string): string => {
    // Matches ```json ... ``` and extracts the content between them.
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Fallback for cases where the AI might just return the JSON without fences,
    // or if the regex fails for some reason.
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

const sanitizeProductInfo = (data: AIProductInfo): AIProductInfo => {
    const price = (data.price || '').trim();
    const normalizedPrice = price.startsWith('$') ? price : (price ? `$${price}` : '');
    const affiliateLink = (() => {
        const link = (data.affiliateLink || '').trim();
        try {
            const u = new URL(link);
            if (u.protocol === 'http:' || u.protocol === 'https:') return link;
        } catch {}
        return '';
    })();
    const imageUrl = isLikelyImageUrl((data.imageUrl || '').trim()) ? (data.imageUrl || '').trim() : FALLBACK_IMAGE_URL;
    return {
        review: (data.review || '').trim(),
        specifications: (data.specifications || '').trim(),
        price: normalizedPrice || '$0.00',
        affiliateLink: affiliateLink || '#',
        imageUrl,
    };
};


export const generateProductInfo = async (productName: string): Promise<AIProductInfo> => {
    try {
        // If serverless endpoint is configured, use it to keep API key server-side
        const serverless = (process.env.SERVERLESS_AI || '').trim();
        if (serverless) {
            const resp = await fetch(`${serverless}/generateProductInfo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName })
            });
            if (!resp.ok) throw new Error('Serverless AI error');
            const data: AIProductInfo = await resp.json();
            return sanitizeProductInfo(data);
        }
        if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert affiliate marketer specializing in PC components. Given the product name "${productName}", generate a compelling product review, a list of key technical specifications (as a single comma-separated string), a realistic current market price in USD (e.g., '$XXX.XX'), and a standard Amazon affiliate link. Then, use your search tool to find a high-quality, official product image URL. Prioritize images from official Amazon product pages, manufacturer websites, or major tech retail sites like Newegg. CRITICAL: The URL must point directly to an image file (e.g., ending in .jpg, .webp, or .png), not an HTML page. The review should be enthusiastic and highlight key features for gamers and PC builders. Respond with ONLY a valid JSON object with the following keys: "review", "price", "affiliateLink", "imageUrl", "specifications". Do not include any other text or markdown formatting.`,
            config: {
                tools: [{googleSearch: {}}],
            }
        });
        const jsonText = cleanJsonString(response.text);
        const productInfo: AIProductInfo = JSON.parse(jsonText);
        return sanitizeProductInfo(productInfo);

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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a PC hardware market analyst. Suggest ${count} new and popular products in the "${category}" category that would be excellent for an affiliate marketing website.

IMPORTANT: Do NOT include any product that matches or is substantially similar (model family/variant) to ANY of the following existing site items (case-insensitive): ${existingNames.slice(0,200).join('; ')}.

Favor diversity across sub-brands, chipsets, sockets, and price tiers. For each product, provide its name and its category. Then, for each, use your search tool to find a high-quality, official product image URL. Prioritize images from official Amazon product pages, manufacturer websites, or major tech retail sites like Newegg. CRITICAL: The URL must point directly to an image file (e.g., ending in .jpg, .webp, or .png), not an HTML page.

Respond with ONLY a valid JSON array of objects, where each object has the keys: "name", "category", and "imageUrl". Do not include any other text or markdown formatting.`,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const jsonText = cleanJsonString(response.text);
        const suggestions: AISuggestedProduct[] = JSON.parse(jsonText);
        // sanitize image URLs, keep others as is
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
    const base = { title };
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/generateBlogPost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, outline }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        return await resp.json();
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Write an SEO-optimized blog post about: ${title}. ${outline ? `Outline: ${outline}.` : ''} Return ONLY a JSON with keys: title, slug, coverImageUrl, summary, content (markdown), tags (array of strings).`,
    });
    const jsonText = cleanJsonString((response as any).text);
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
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a detailed comparison titled "${title}" of these products and their specs: ${JSON.stringify(products)}. Return ONLY a JSON with keys: title, productIds (empty array placeholder), content (markdown), specDiffSummary.`,
    });
    const jsonText = cleanJsonString((response as any).text);
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
    const system = `You are an expert PC hardware assistant for an affiliate site. Provide accurate, concise answers that help select, compare, and recommend PC parts. If helpful, encourage comparisons and link strategies.`;
    const context = opts?.context ? `\nContext:\n${opts.context}` : '';
    const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `${system}${context}\n\nConversation so far:\n${history}\n\nAssistant:`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return (response as any).text as string;
};

export const generateProductSEO = async (name: string, category: string, review: string): Promise<{ seoTitle: string; seoDescription: string }> => {
    const serverless = (process.env.SERVERLESS_AI || '').trim();
    if (serverless) {
        const resp = await fetch(`${serverless}/generateProductSEO`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, review }) });
        if (!resp.ok) throw new Error('Serverless AI error');
        return await resp.json();
    }
    if (!isAIEnabled) throw new Error('GEMINI_API_KEY is not configured');
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create an SEO title (<=60 chars) and meta description (<=155 chars) for a product page. Product name: ${name}. Category: ${category}. Summary: ${review}. Return JSON {"seoTitle":"...","seoDescription":"..."}.`
    });
    const jsonText = cleanJsonString((response as any).text);
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
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Suggest ${count} direct rival product names for: ${name}. Specs: ${specifications}. Focus on same class and price tier. Return ONLY a JSON array of strings (names).`
    });
    const jsonText = cleanJsonString((response as any).text);
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
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extract a list of PC product names from the following text. Include model identifiers (e.g., RTX 4070 SUPER, Ryzen 7 7800X3D). Return ONLY a JSON array of strings. Text: ${text}`,
    });
    const jsonText = cleanJsonString((response as any).text);
    const arr = JSON.parse(jsonText);
    return Array.isArray(arr) ? arr : [];
};
