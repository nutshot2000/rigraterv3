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

// Validate image URLs with multiple attempts
async function validateImages(urls: string[]): Promise<string[]> {
    const valid: string[] = [];
    console.log(`Validating ${urls.length} image URLs...`);
    
    // Process in parallel with timeout
    const validationPromises = urls.slice(0, 20).map(async (url) => {
        try {
            // Try original URL first
            if (await testImageUrl(url)) {
                return url;
            }
            
            // For Amazon URLs, try stripping size tokens
            if (url.includes('amazon.com/images/I/')) {
                const stripped = url
                    .replace(/\._AC_SL\d+_/i, '')
                    .replace(/\._SL\d+_/i, '')
                    .replace(/\._SX\d+_/i, '')
                    .replace(/\._SY\d+_/i, '')
                    .replace(/\._UX\d+_/i, '')
                    .replace(/\._UY\d+_/i, '')
                    .replace(/\._SS\d+_/i, '')
                    .replace(/\._SR\d+,\d+_/i, '')
                    .replace(/\._CR\d+,\d+,\d+,\d+_/i, '');
                
                if (stripped !== url && await testImageUrl(stripped)) {
                    return stripped;
                }
                
                // Try different Amazon sizes
                const baseMatch = url.match(/^(.+?)_SL\d+_(.+)$/i);
                if (baseMatch) {
                    const [, base, ext] = baseMatch;
                    const sizes = ['1500', '1200', '1000', '800', '600', '500', '400', '300', '200'];
                    for (const size of sizes) {
                        const testUrl = `${base}_SL${size}_${ext}`;
                        if (await testImageUrl(testUrl)) {
                            return testUrl;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.log(`Validation failed for ${url}:`, error);
            return null;
        }
    });
    
    const results = await Promise.all(validationPromises);
    const validUrls = results.filter(url => url !== null) as string[];
    
    console.log(`Found ${validUrls.length} valid images out of ${urls.length}`);
    return validUrls.slice(0, 8); // Limit to 8 images max
}

async function testImageUrl(url: string): Promise<boolean> {
    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(url, { 
            method: 'HEAD',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            return contentType.startsWith('image/');
        }
        
        // Some servers reject HEAD, try GET with small range
        if (response.status === 405 || response.status === 403) {
            const getController = new AbortController();
            const getTimeoutId = setTimeout(() => getController.abort(), 5000);
            
            const getResponse = await fetch(url, {
                method: 'GET',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                    'Range': 'bytes=0-1023'
                },
                signal: getController.signal
            });
            
            clearTimeout(getTimeoutId);
            return getResponse.ok && (getResponse.headers.get('content-type') || '').startsWith('image/');
        }
        
        return false;
    } catch (error) {
        console.log(`Image test failed for ${url}:`, error.message);
        return false;
    }
}

// Extract structured Product JSON-LD when present
function extractJsonLdProduct(html: string): any {
    const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of scripts) {
        const text = m[1].trim();
        try {
            const cleaned = text.replace(/\u0000/g, '');
            const parsed = JSON.parse(cleaned);
            const candidates = Array.isArray(parsed) ? parsed : [parsed];
            for (const node of candidates) {
                if (!node) continue;
                if ((node['@type'] === 'Product') || (Array.isArray(node['@type']) && node['@type'].includes('Product'))) {
                    return node;
                }
            }
        } catch {}
    }
    return null;
}

// Extract brand from Amazon byline and title
function extractBrand(html: string, title: string): string {
    const byline = html.match(/id=["']bylineInfo["'][^>]*>([^<]+)</i)?.[1]?.trim() || '';
    if (byline) {
        const visit = byline.replace(/Visit the\s+|Store/gi, '').trim();
        if (visit) return visit;
    }
    const json = extractJsonLdProduct(html);
    const fromJson = typeof json?.brand === 'string' ? json.brand : (json?.brand?.name || '');
    if (fromJson) return fromJson;
    const fromTitle = title.split(' ')[0] || '';
    return fromTitle;
}

// Extract price from common Amazon locations and JSON-LD
function extractPrice(html: string): string {
    // JSON-LD offers price
    try {
        const json = extractJsonLdProduct(html);
        const price = json?.offers?.price;
        const currency = json?.offers?.priceCurrency || 'USD';
        if (price) {
            const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
            return `${symbol}${String(price)}`;
        }
    } catch {}

    // Common price blocks
    const candidates = [
        /id=["']priceblock_ourprice["'][^>]*>\s*([^<]+)/i,
        /id=["']priceblock_dealprice["'][^>]*>\s*([^<]+)/i,
        /id=["']apex_desktop_qualifiedBuybox_price["'][^>]*>\s*([^<]+)/i,
        /class=["'][^"']*a-price-whole[^"']*["'][^>]*>\s*([^<]+)/i
    ];
    for (const re of candidates) {
        const m = html.match(re);
        if (m && m[1]) {
            const raw = m[1].replace(/\s/g, '').replace(/&nbsp;/g, '');
            if (/^£|^\$|^€/.test(raw)) return raw;
            if (/^\d/.test(raw)) return `$${raw}`;
        }
    }
    // fallback: first currency-like token
    const currency = html.match(/(£|\$|€)\s?(\d+[,.]?\d{0,2})/);
    if (currency) return `${currency[1]}${currency[2]}`;
    return '$0.00';
}

// Extract specifications from Amazon detail tables and product overview
function extractAmazonSpecs(html: string): Record<string, string> {
    const specs: Record<string, string> = {};

    // product overview table
    const overview = html.match(/id=["']productOverview_feature_div["'][\s\S]*?<table[\s\S]*?<\/table>/i)?.[0] || '';
    if (overview) {
        const rows = [...overview.matchAll(/<tr[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)];
        for (const r of rows) {
            const key = r[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            const val = r[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            if (key && val) specs[key] = val;
        }
    }

    // tech spec tables
    const tech1 = html.match(/id=["']productDetails_techSpec_section_1["'][\s\S]*?<table[\s\S]*?<\/table>/i)?.[0] || '';
    const tech2 = html.match(/id=["']productDetails_techSpec_section_2["'][\s\S]*?<table[\s\S]*?<\/table>/i)?.[0] || '';
    for (const block of [tech1, tech2]) {
        if (!block) continue;
        const rows = [...block.matchAll(/<tr[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)];
        for (const r of rows) {
            const key = r[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            const val = r[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            if (key && val) specs[key] = val;
        }
    }

    // feature bullets as Features
    const bulletsBlock = html.match(/id=["']feature-bullets["'][\s\S]*?<ul[\s\S]*?<\/ul>/i)?.[0] || '';
    if (bulletsBlock) {
        const bullets = [...bulletsBlock.matchAll(/<li[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/li>/gi)]
            .map(b => b[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim())
            .filter(Boolean);
        if (bullets.length) specs['Features'] = bullets.slice(0, 6).join('; ');
    }

    return specs;
}

// Compose a review if AI returns short/missing content
function expandReviewIfShort(review: string, name: string, brand: string, category: string, specs: Record<string,string>): string {
    const wordCount = (review || '').split(/\s+/).filter(Boolean).length;
    if (wordCount >= 180) return review;
    const highlights = Object.entries(specs).slice(0, 6).map(([k,v]) => `${k}: ${v}`).join(', ');
    const intro = `The ${brand ? brand + ' ' : ''}${name} is a compelling ${category || 'tech'} option designed for buyers who want dependable performance without breaking the bank.`;
    const body = ` In day-to-day use it delivers consistent results, and the spec sheet backs that up (${highlights || 'balanced specifications for its class'}). Build quality is solid and the overall design feels considered.`;
    const value = ` Value-wise, it stacks up well against popular alternatives in its price bracket, and will suit most users looking for a hassle-free upgrade.`;
    const close = ` If you want a quick recommendation: if the price is right and the features above match your needs, this is an easy product to shortlist.`;
    return [intro, body, value, close].join(' ');
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

                // Extract basic data from HTML first
                const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
                const title = titleMatch ? titleMatch[1].replace(/\s*:\s*Amazon\.co\.uk.*$/i, '').trim() : '';
                const brand = extractBrand(html, title);
                const price = extractPrice(html);
                const specMap = extractAmazonSpecs(html);
                const specsInline = Object.entries(specMap).map(([k,v]) => `${k}: ${v}`).join(', ');
                
                // AI extraction with better context
                if (ai) {
                    try {
                        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
                        const prompt = `You are a senior tech reviewer and sales expert at a major publication like The Verge, TechCrunch, or PC Gamer. You have years of experience testing products and helping consumers make smart purchasing decisions. You're known for honest, detailed reviews that drive sales through trust and expertise.

You're reviewing this product: ${title}
Brand: ${brand}
Price: ${price}
URL: ${input}
Parsed Specifications (from page): ${specsInline || 'None detected'}

Your assignment:
1. Product name (clean, marketing-friendly)
2. Brand identification
3. Category (specific tech category like "GPU", "CPU", "Keyboard", "Mouse", "Monitor", "Headphones", etc.)
4. Price in USD format like "$XXX.XX"
5. Detailed specifications based on your expertise and any specs found on the page (format as "Key: Value, Key: Value")
6. Write a professional review (250-350 words) as if you've personally tested this product. Include:
   - Performance analysis and benchmarks
   - Build quality and design assessment
   - Value proposition and pricing analysis
   - Target audience and use cases
   - Comparison to competitors
   - Pros and cons
   - Final verdict and recommendation
7. SEO title (under 60 chars, include brand and key feature)
8. SEO description (under 155 chars, compelling summary)
9. URL-friendly slug (lowercase, hyphens, no special chars)

WRITING STYLE:
- Write with authority and expertise
- Be honest about strengths and weaknesses
- Use technical language appropriately
- Give specific examples and comparisons
- Make clear recommendations
- Sound like a seasoned reviewer who knows their stuff
- Be persuasive but not pushy - focus on value and benefits
- Create urgency when appropriate (limited time offers, great deals)
- Address common objections and concerns
- Use power words that drive action (premium, exceptional, must-have, game-changer)
- End with a strong call-to-action that feels natural

HTML Content (first 40k chars):
${html.substring(0, 40000)}

Return ONLY valid JSON with these exact keys: name, brand, category, price, specifications, review, seoTitle, seoDescription, slug, affiliateLink`;
                        
                        const result = await model.generateContent(prompt);
                        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
                        productData = JSON.parse(jsonText);
                        
                        // Ensure essential fields and merge extracted specs/price when missing
                        if (!productData.name || productData.name.length < 3) productData.name = title || 'Product from URL';
                        if (!productData.brand) productData.brand = brand || productData.name.split(' ')[0] || '';
                        if (!productData.price || !/^[£$€]/.test(productData.price)) productData.price = price;
                        if (!productData.specifications && specsInline) productData.specifications = specsInline;
                        if (!productData.slug) productData.slug = (productData.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        if (!productData.review || productData.review.split(/\s+/).length < 160) {
                            productData.review = expandReviewIfShort(productData.review || '', productData.name, productData.brand, productData.category || 'tech', specMap);
                        }
                    } catch (e) {
                        console.error('AI extraction failed:', e);
                        // Fallback with extracted data
                        productData = {
                            name: title || 'Product from URL',
                            brand: brand || 'Unknown',
                            category: 'Misc',
                            price: price,
                            specifications: specsInline || 'Specifications: Check product page for detailed specs',
                            review: expandReviewIfShort('', title || 'Product', brand || '', 'tech', specMap),
                            seoTitle: `${title || 'Product'} | Review & Specs`,
                            seoDescription: `Explore ${title || 'this product'}: key specs, pricing, and detailed review for informed decisions.`,
                            slug: (title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                            affiliateLink: input
                        };
                    }
                } else {
                    productData = {
                        name: title || 'Product from URL',
                        brand: brand || 'Unknown',
                        category: 'Misc',
                        price: price,
                        specifications: specsInline || 'Specifications: Check product page for detailed specs',
                        review: expandReviewIfShort('', title || 'Product', brand || '', 'tech', specMap),
                        seoTitle: `${title || 'Product'} | Review & Specs`,
                        seoDescription: `Explore ${title || 'this product'}: key specs, pricing, and detailed review.`,
                        slug: (title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                        affiliateLink: input
                    };
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
