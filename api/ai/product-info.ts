import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProductInfo } from '../../types';

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
if (!GEMINI_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
}
const ai = new GoogleGenerativeAI(GEMINI_KEY);

const cleanJsonString = (rawText: string): string => {
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return rawText.trim();
};

export default async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { productUrl } = await req.json();
        if (!productUrl) {
            return new Response(JSON.stringify({ error: 'productUrl is required' }), { status: 400 });
        }

        // Fetch and process the page content (basic text extraction)
        const pageResponse = await fetch(productUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await pageResponse.text();

        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            You are an expert e-commerce data extractor for a PC parts website.
            Analyze the following HTML from a product page: ${html.substring(0, 30000)}
            
            Extract the following information:
            1.  **name**: The full, official product name.
            2.  **brand**: The manufacturer/brand name.
            3.  **category**: The most specific PC part category (e.g., "GPU", "CPU Cooler", "Motherboard", "Keyboard").
            4.  **price**: The current price in USD, formatted as "$XXX.XX". If the currency is not USD, convert it.
            5.  **imageUrls**: An array of direct, high-resolution image URLs (ending in .jpg, .png, .webp). Find at least 3 if possible.
            6.  **review**: A concise, professional summary of the product's key features and benefits for a PC builder.
            7.  **specifications**: A single string of key-value pairs separated by commas (e.g., "Chipset: Z790, Socket: LGA1700, Memory: DDR5").
            8.  **affiliateLink**: The original URL with an appropriate affiliate tag if possible, otherwise the original URL.
            9.  **slug**: A URL-friendly slug from the product name.
            10. **seoTitle**: An SEO-optimized title (under 60 characters).
            11. **seoDescription**: An SEO-optimized meta description (under 160 characters).

            Respond with ONLY a valid JSON object.
        `;

        const result = await model.generateContent(prompt);
        const jsonText = cleanJsonString(result.response.text());
        const productInfo = JSON.parse(jsonText);

        return new Response(JSON.stringify(productInfo), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Error in product-info API:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error.message }), { status: 500 });
    }
};

export const config = {
  runtime: 'edge',
};
