import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

// Extract ASIN from Amazon URL
function extractASIN(url: string): string | null {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/product\/([A-Z0-9]{10})/i);
    return match ? match[1] : null;
}

// Generate Amazon image URLs from ASIN
function generateAmazonImages(asin: string): string[] {
    const base = `https://m.media-amazon.com/images/I/${asin}`;
    const sizes = ['1500', '1200', '1000', '800', '600', '500', '400', '300'];
    return sizes.map(size => `${base}._SL${size}_.jpg`);
}

// Extract images from HTML
function extractImagesFromHTML(html: string): string[] {
    const urls = new Set<string>();
    
    // 1) data-old-hires
    const oldHiresMatches = [...html.matchAll(/data-old-hires\s*=\s*"(https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))"/gi)];
    oldHiresMatches.forEach(m => urls.add(m[1]));

    // 2) data-a-dynamic-image JSON
    const dynAttr = [...html.matchAll(/data-a-dynamic-image\s*=\s*"([\s\S]*?)"/gi)];
    for (const m of dynAttr) {
        try {
            const jsonText = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const obj = JSON.parse(jsonText);
            Object.keys(obj).forEach(k => urls.add(k));
        } catch {}
    }

    // 3) hiRes in JSON
    const hiResMatches = [...html.matchAll(/\"hiRes\"\s*:\s*\"(https?:\\\/[^"]+?\.(?:jpg|jpeg|png|webp))\"/gi)];
    hiResMatches.forEach(m => {
        const u = m[1].replace(/\\\//g, '/');
        urls.add(u);
    });

    // 4) General img src
    const imgSrcRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi;
    (html.match(imgSrcRegex) || []).forEach(u => urls.add(u));

    return Array.from(urls).slice(0, 20);
}

// Validate image URLs
async function validateImages(urls: string[]): Promise<string[]> {
    const valid: string[] = [];
    
    for (const url of urls) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                valid.push(url);
            }
        } catch {}
    }
    
    return valid;
}

// Heuristic completion for name-only
function heuristicComplete(name: string) {
    const category = /gpu|graphics|rtx|gtx/i.test(name) ? 'GPU' : 
                   /cpu|processor|ryzen|intel/i.test(name) ? 'CPU' : 
                   /keyboard|keychron|razer|logitech/i.test(name) ? 'Keyboard' : 
                   /mouse|gaming/i.test(name) ? 'Mouse' : 'Misc';
    
    const brand = name.split(' ')[0];
    const seoTitle = `${name} | ${category} Review & Specs`;
    const seoDescription = `Explore ${name}: key specs, pricing, and quick AI-style summary for faster decisions.`;
    const review = `The ${name} is a strong option in the ${category} category. Highlights include reliable build quality, balanced performance, and good value. Check the specifications for precise details and compare with rivals to decide if it fits your build.`;
    
    return {
        name,
        brand,
        category,
        price: '$0.00',
        specifications: '',
        review,
        seoTitle,
        seoDescription,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        affiliateLink: ''
    };
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    try {
        const { input } = req.body || {};
        if (!input?.trim()) return res.status(400).json({ error: 'input is required' });

        const isUrl = input.startsWith('http');
        let productData: any = {};
        let imageUrls: string[] = [];

        if (isUrl) {
            // URL path: fetch page, extract data
            try {
                const pageResponse = await fetch(input, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                const html = await pageResponse.text();

                // Extract ASIN for Amazon images
                const asin = extractASIN(input);
                if (asin) {
                    imageUrls = generateAmazonImages(asin);
                }

                // Extract images from HTML
                const htmlImages = extractImagesFromHTML(html);
                imageUrls = [...imageUrls, ...htmlImages];

                // Validate images
                imageUrls = await validateImages(imageUrls);

                // AI extraction
                if (ai) {
                    try {
                        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
                        const prompt = `Extract product data from this HTML. Return ONLY valid JSON with keys: name, brand, category, price (USD like "$XXX.XX"), specifications (comma-separated key: value pairs), review (120-200 words), seoTitle (<=60 chars), seoDescription (<=155 chars), slug (URL-friendly), affiliateLink.

HTML:\n${html.substring(0, 30000)}`;
                        const result = await model.generateContent(prompt);
                        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
                        productData = JSON.parse(jsonText);
                    } catch (e) {
                        console.error('AI extraction failed:', e);
                        productData = heuristicComplete('Product from URL');
                    }
                } else {
                    productData = heuristicComplete('Product from URL');
                }
            } catch (e) {
                console.error('URL processing failed:', e);
                productData = heuristicComplete('Product from URL');
            }
        } else {
            // Name-only path
            if (ai) {
                try {
                    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const prompt = `Generate product details for: ${input}.
Return ONLY JSON with keys: name, brand, category, price (USD like "$XXX.XX"), specifications (comma-separated key: value pairs), review (120-200 words), seoTitle (<=60 chars), seoDescription (<=155 chars), slug (URL-friendly), affiliateLink.`;
                    const result = await model.generateContent(prompt);
                    const jsonText = result.response.text().replace(/```json|```/g, '').trim();
                    productData = JSON.parse(jsonText);
                } catch (e) {
                    console.error('AI name generation failed:', e);
                    productData = heuristicComplete(input);
                }
            } else {
                productData = heuristicComplete(input);
            }
        }

        // Ensure required fields
        const finalProduct = {
            name: productData.name || input,
            brand: productData.brand || productData.name?.split(' ')[0] || '',
            category: productData.category || 'Misc',
            price: productData.price || '$0.00',
            specifications: productData.specifications || '',
            review: productData.review || 'Review pending...',
            seoTitle: productData.seoTitle || `${productData.name} | Review & Specs`,
            seoDescription: productData.seoDescription || `Explore ${productData.name}: key specs, pricing, and quick AI-style summary.`,
            slug: productData.slug || productData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '',
            affiliateLink: productData.affiliateLink || '',
            imageUrls: imageUrls.slice(0, 10) // Limit to 10 images
        };

        return res.status(200).json(finalProduct);

    } catch (error: any) {
        console.error('build-product error:', error);
        return res.status(500).json({ error: 'Failed to build product', details: error?.message || String(error) });
    }
}

export const config = { runtime: 'nodejs' };
