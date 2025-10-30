import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash').trim();
const AMAZON_TAG_US = (process.env.AMAZON_TAG_US || process.env.VITE_AMAZON_TAG_US || '').trim();
const AMAZON_TAG_UK = (process.env.AMAZON_TAG_UK || process.env.VITE_AMAZON_TAG_UK || '').trim();
const ai = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null as any;

function clamp(str: string, max: number): string {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max - 1).trimEnd();
}

function canonicalCategory(name: string, raw: string): string {
    const s = (raw || '').toLowerCase();
    const n = (name || '').toLowerCase();
    const has = (k: RegExp) => k.test(s) || k.test(n);
    if (has(/\bgpu|graphics|geforce|radeon|rtx|gtx\b/)) return 'GPU';
    if (has(/\bcpu|processor|ryzen|intel core|i\d-\d{4,}\b/)) return 'CPU';
    if (has(/\bmotherboard|b\d{3}|z\d{3}|x\d{3}\b/)) return 'Motherboard';
    if (has(/\bram|ddr\d|memory\b/)) return 'RAM';
    if (has(/\bssd|nvme|m\.2|hdd|storage\b/)) return 'Storage';
    if (has(/\bcase\b|pc case|tower/)) return 'Case';
    if (has(/\bkeyboard\b|keychron|mechanical/)) return 'Keyboard';
    if (has(/\bmouse\b|gaming mouse/)) return 'Mouse';
    if (has(/\bmonitor\b|display\b/)) return 'Monitor';
    if (has(/\bheadset\b|headphones\b/)) return 'Headset';
    return raw || 'Misc';
}

function guessBrand(name: string, fallback?: string): string {
    const brands = ['AMD','Intel','NVIDIA','ASUS','MSI','Gigabyte','NZXT','Corsair','Crucial','Kingston','Samsung','Seagate','WD','Western Digital','Keychron','Logitech','Razer','SteelSeries','HyperX','ASRock','Acer','Dell','Lenovo','Cooler Master'];
    const lower = (name || '').toLowerCase();
    for (const b of brands) if (lower.includes(b.toLowerCase())) return b;
    return fallback || (name || '').split(/\s+/)[0] || '';
}
function normalizePrice(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '$0.00';
    if (/^[£$€]/.test(s)) return s;
    if (/^\d/.test(s)) return `$${s}`;
    return '$0.00';
}

function normalizeSeo(data: any): any {
    const out = { ...data };
    out.seoTitle = clamp((out.seoTitle || out.name || '').trim(), 60);
    out.seoDescription = clamp((out.seoDescription || '').trim(), 155);
    return out;
}

function getAmazonImageBase(url: string): string {
    // Extracts the unique part of an Amazon image URL, like '710bB5V1jPL'
    // from https://m.media-amazon.com/images/I/710bB5V1jPL._SL1500_.jpg
    const match = url.match(/\/images\/I\/([A-Za-z0-9]+)/);
    return match ? match[1] : url;
}

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
            // Trust Amazon CDN image URLs without network validation to avoid 403/HEAD blockers
            if (/\b(?:m\.)?media-amazon\.com\/images\/I\//i.test(url) || /ssl-images-amazon\.com\/images\/I\//i.test(url) || /images-na\.ssl-images-amazon\.com\/images\/I\//i.test(url)) {
                return url;
            }
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
    // If nothing validated, still return original Amazon CDN images as a last resort
    if (validUrls.length === 0) {
        const amazonOnly = urls.filter(u => /(?:m\.)?media-amazon\.com\/images\/I\//i.test(u) || /ssl-images-amazon\.com\/images\/I\//i.test(u) || /images-na\.ssl-images-amazon\.com\/images\/I\//i.test(u));
        if (amazonOnly.length) return amazonOnly.slice(0, 8);
    }
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
    // 1) JSON-LD offers price (most reliable)
    try {
        const json = extractJsonLdProduct(html);
        const offer = Array.isArray(json?.offers) ? json?.offers[0] : json?.offers;
        const price = offer?.price || offer?.lowPrice || offer?.highPrice;
        const currency = offer?.priceCurrency || json?.offers?.priceCurrency || 'USD';
        if (price) {
            const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
            return `${symbol}${String(price)}`;
        }
    } catch {}

    // 2) Known Amazon price containers
    const priceBlocks: RegExp[] = [
        /id=["']apex_priceToPay["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
        /id=["']corePrice_feature_div["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
        /id=["']corePriceDisplay_desktop_feature_div["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
        /id=["']priceblock_ourprice["'][^>]*>\s*([^<]+)/i,
        /id=["']priceblock_dealprice["'][^>]*>\s*([^<]+)/i,
        /id=["']apex_desktop_qualifiedBuybox_price["'][^>]*>\s*([^<]+)/i,
    ];
    for (const re of priceBlocks) {
        const m = html.match(re);
        if (m && m[1]) {
            const raw = m[1].replace(/\s+/g, '').replace(/&nbsp;/g, '');
            if (/^£|^\$|^€/.test(raw)) return raw;
            if (/^\d/.test(raw)) return `$${raw}`;
        }
    }

    // 3) Assemble from whole + fraction within nearby price sections
    const assembleBlocks: RegExp[] = [
        /id=["']apex_priceToPay["'][\s\S]*?<\/?span[\s\S]*?a-price-whole[\s\S]*?>\s*([\d,.]+)[\s\S]*?a-price-fraction[\s\S]*?>\s*(\d{2})/i,
        /id=["']corePrice_feature_div["'][\s\S]*?a-price-whole[\s\S]*?>\s*([\d,.]+)[\s\S]*?a-price-fraction[\s\S]*?>\s*(\d{2})/i,
    ];
    for (const re of assembleBlocks) {
        const m = html.match(re);
        if (m) {
            const whole = m[1].replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,/g, '');
            const frac = m[2];
            const near = html.match(/(£|\$|€)/)?.[1] || '$';
            return `${near}${whole}.${frac}`;
        }
    }

    // If Amazon hides price behind cart, avoid guessing from form fields
    if (/add this item to your cart/i.test(html)) {
        return '$0.00';
    }

    // 4) Heuristic: choose the maximum currency token on the page, but ignore coupon/save/lower-price form contexts
    const currencyTokens = [
        ...html.matchAll(/(£|\$|€)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g)
    ];
    if (currencyTokens.length) {
        let best: { sym: string; val: number } | null = null;
        for (const m of currencyTokens) {
            const idx = (m.index || 0);
            const context = html.slice(Math.max(0, idx - 100), Math.min(html.length, idx + 100)).toLowerCase();
            if (/coupon|save|off|subscribe|per\s+month|installment|found\s+a\s+lower\s+price|tell\s+us\s+about\s+a\s+lower\s+price|price\s*\(\$\)/.test(context)) continue;
            const sym = m[1];
            const num = parseFloat(m[2].replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,(?=\d{2}$)/, '.'));
            if (!isFinite(num)) continue;
            if (!best || num > best.val) best = { sym, val: num };
        }
        if (best) return `${best.sym}${best.val.toFixed(2)}`;
    }

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
            let val = r[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            if (/function\s*\(|window\.|var\s+\w+/.test(val)) continue;
            val = val.replace(/See more\.?$/i, '').trim();
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
            let val = r[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
            if (/function\s*\(|window\.|var\s+\w+/.test(val)) continue;
            val = val.replace(/See more\.?$/i, '').trim();
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

// Compose a slightly shorter review if AI returns short/missing content
function shortenDisplayName(name: string, brand: string): string {
    if (!name) return brand || 'Product';
    let n = name
        .replace(/[®™]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // Drop warranty/marketing tails and heavy spec chains
    n = n.split(' - ')[0];
    n = n.split(' | ')[0];
    n = n.split(',')[0];
    // Remove long parenthetical blocks
    n = n.replace(/\([^)]{20,}\)/g, '').replace(/\s+/g, ' ').trim();
    // Clamp length at a word boundary without adding ellipsis (avoid in-sentence …)
    if (n.length > 60) {
        const cut = n.slice(0, 60);
        const lastSpace = cut.lastIndexOf(' ');
        n = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd();
    }
    // Ensure brand isn't duplicated at the start
    const lb = (brand || '').toLowerCase();
    const ln = n.toLowerCase();
    if (brand && ln.startsWith(lb + ' ')) return n;
    return brand ? `${brand} ${n}` : n;
}

function expandReviewIfShort(review: string, name: string, brand: string, category: string, specs: Record<string,string>): string {
    const wordCount = (review || '').split(/\s+/).filter(Boolean).length;
    if (wordCount >= 230) return review;

    const getSpecVal = (keys: string[]): string | undefined => {
        const entries = Object.entries(specs || {});
        for (const [k, v] of entries) {
            const lk = k.toLowerCase();
            if (keys.some(q => lk.includes(q.toLowerCase()))) return v;
        }
        return undefined;
    };

    const pairs = Object.entries(specs || {}).slice(0, 6);
    const displayName = shortenDisplayName(name, brand);
    const cat = (category || '').toLowerCase();
    const noun = cat.includes('monitor') ? 'monitor' :
                 cat.includes('keyboard') ? 'keyboard' :
                 cat.includes('mouse') ? 'mouse' :
                 (cat.includes('power') || cat.includes('psu')) ? 'power supply' :
                 (category || 'product');
    const firstMention = (name && name.length <= 60) ? displayName : `${brand ? brand + ' ' : ''}${noun}`;

    // Light heuristics for monitors
    const refreshFromName = (name || '').match(/(\d{3})\s*hz/i)?.[1];
    const refreshSpec = getSpecVal(['refresh']);
    const panelRaw = (name + ' ' + (getSpecVal(['panel']) || '')).match(/\b(ips|va|tn|oled|mini-?led)\b/i)?.[1];
    const hdrGrade = (name + ' ' + (getSpecVal(['hdr']) || '')).match(/hdr\s*([0-9]{3,4})/i)?.[1];
    const combined = `${name} ${Object.entries(specs || {}).map(([k,v]) => `${k}: ${v}`).join(' ')}`;
    // Avoid picking the "75" from "1.75 inches" by ensuring the number isn't part of a decimal
    const sizeMatch = combined.match(/(^|[^0-9.])(\d{2})(?=\s?(?:"|in(?:ches)?\b))/i);
    const sizeInch = sizeMatch ? sizeMatch[2] : undefined;
    const hasUsbC = /usb[-\s]?c|type[-\s]?c/i.test(combined);
    const vrr = /g[-\s]?sync|freesync|vrr/i.test(combined) ? 'VRR support' : '';
    const res = (() => {
        if (/3840\s*x\s*2160|\b4k\b|2160p/i.test(combined)) return '4K';
        if (/2560\s*x\s*1440|\bqhd\b|1440p/i.test(combined)) return '1440p';
        if (/1920\s*x\s*1080|\bfhd\b|1080p/i.test(combined)) return '1080p';
        return undefined;
    })();
    const refresh = refreshFromName || (refreshSpec?.match(/\d{3}/)?.[0]);

    const blocks: string[] = [];
    const lcAll = (name + ' ' + combined).toLowerCase();
    const isMotherboard = /(motherboard|lga\s?\d{3,5}|am4|am5|z\d{3}\b|b\d{3}\b|x\d{3}\b|pci\s?-?e|vrm|m\.?2|\batx\b|micro[-\s]?atx)/i.test(lcAll);
    const catNormalized = isMotherboard ? 'motherboard' : cat;

    if (catNormalized.includes('monitor') || catNormalized.includes('display')) {
        const introParts: string[] = [];
        introParts.push('The ' + firstMention);
        const keyBits: string[] = [];
        if (sizeInch) keyBits.push(`${sizeInch}"`);
        if (res) keyBits.push(res);
        if (refresh) keyBits.push(`${refresh}Hz`);
        if (panelRaw) keyBits.push(panelRaw.toUpperCase());
        blocks.push(`${introParts.join(' ')} is a ${keyBits.join(' ')} gaming monitor focused on smooth motion and clean, punchy visuals.`);
        const perfLine: string[] = [];
        if (refresh) perfLine.push('fast motion stays fluid');
        if (vrr) perfLine.push(vrr.toLowerCase());
        if (panelRaw) perfLine.push(`${panelRaw.toUpperCase()} consistency`);
        if (perfLine.length) blocks.push(`In use, ${perfLine.join(', ')}.`);
        if (hasUsbC) blocks.push('USB‑C simplifies laptop hookup (video/data; power delivery may vary).');
        if (hdrGrade) blocks.push(`HDR${hdrGrade} is entry‑level—expect modest highlights rather than true HDR.`);
        if (res && sizeInch) blocks.push(`Text looks crisp at ${res} on ${sizeInch}", and color balance is easy to tune for work and play.`);
        blocks.push('Ergonomics cover the basics (tilt/height), and the I/O selection suits modern PCs and laptops.');
        blocks.push('Compared with typical high‑refresh 1440p options, this brings smoothness and clarity that feel great in games and everyday use.');
        blocks.push('It feels like a clear upgrade you’ll notice every day and be happy to live with.');
    } else if (catNormalized.includes('motherboard')) {
        blocks.push(`The ${firstMention} targets builders who want reliable power delivery, modern connectivity, and painless setup.`);
        blocks.push('VRM design keeps thermals in check for sustained loads, and BIOS updates are straightforward.');
        blocks.push('You get plenty of storage and I/O: fast M.2 slots, PCIe for GPUs/expansion, and ample USB—including high‑speed rear I/O.');
    } else if (cat.includes('keyboard')) {
        blocks.push(`The ${firstMention} focuses on comfortable typing with a solid, fuss‑free layout.`);
        blocks.push(`Switch feel is consistent, stabilizers are decent, and acoustics are well‑controlled for the class.`);
        blocks.push('Key legends are clear and the build resists flex, which adds to long‑term confidence.');
        blocks.push('If you care about everyday comfort and tidy desk aesthetics, it hits a sweet spot.');
    } else if (cat.includes('mouse')) {
        blocks.push(`The ${firstMention} delivers accurate tracking and a shape that suits most hand sizes.`);
        blocks.push(`Buttons feel crisp and the scroll is confident without being noisy.`);
        blocks.push('Glide is smooth on common mouse pads, and the shell finish handles long sessions well.');
        blocks.push('It’s an easy upgrade if you want reliable aim without paying flagship prices.');
    } else if (cat.includes('power') || cat.includes('psu')) {
        blocks.push(`The ${firstMention} aims for dependable delivery with clean cabling and low noise.`);
        blocks.push(`Efficiency is competitive and thermals stay in check under typical loads.`);
        blocks.push('Ripple suppression and protections are in line with reputable units at this tier.');
        blocks.push('It’s the kind of PSU you install and forget—stable, quiet, and tidy.');
    } else {
        blocks.push(`The ${firstMention} is a balanced ${category || 'tech'} pick with good everyday usability.`);
        blocks.push(`Performance feels consistent and build quality inspires confidence for the price.`);
        blocks.push('It strikes a nice blend of capability and polish without chasing halo‑tier features—an upgrade you’ll feel good about owning.');
    }

    // Build a concise spec summary rather than dumping page labels
    const specBits: string[] = [];
    if (catNormalized.includes('motherboard')) {
        const socket = getSpecVal(['socket', 'lga', 'am5']);
        const chipset = getSpecVal(['chipset']);
        const form = getSpecVal(['form factor']);
        const m2 = getSpecVal(['m.2', 'm2']);
        const pcie = getSpecVal(['pcie', 'pci-e']);
        if (socket) specBits.push(`Socket ${socket}`);
        if (chipset) specBits.push(String(chipset));
        if (form) specBits.push(String(form));
        if (m2) specBits.push(`${m2} M.2`);
        if (pcie) specBits.push(`PCIe ${pcie}`);
    } else {
        if (sizeInch) specBits.push(`${sizeInch}"`);
        if (res) specBits.push(res);
        if (refresh) specBits.push(`${refresh}Hz`);
        if (panelRaw) specBits.push(panelRaw.toUpperCase());
        if (hdrGrade) specBits.push(`HDR${hdrGrade}`);
        if (hasUsbC) specBits.push('USB‑C');
    }
    const specLine = specBits.length ? `Key specs — ${specBits.join(', ')}.` : '';

    const whoFor = catNormalized.includes('motherboard')
        ? `Ideal if you want a stable build with fast storage and next‑gen connectivity without paying for halo boards.`
        : `If you want smooth gameplay and sharp text without chasing flagship pricing, this monitor fits well.`;

    // Add Pros/Cons bullets as plain lines inside the paragraph text
    const pros: string[] = [];
    if (catNormalized.includes('motherboard')) {
        const socket = getSpecVal(['socket', 'lga', 'am5']);
        if (socket) pros.push(`Compatible with ${socket} CPUs`);
        if (getSpecVal(['m.2'])) pros.push('Multiple M.2 NVMe slots');
        if (getSpecVal(['wifi'])) pros.push('Integrated Wi‑Fi for easy networking');
        pros.push('Solid VRM and cooling for sustained loads');
    } else {
        if (res) pros.push(`${res} sharpness at ${sizeInch || 'this'}"`);
        if (refresh) pros.push(`${refresh}Hz with ${vrr || 'VRR'} for fluid motion`);
        if (panelRaw) pros.push(`${panelRaw.toUpperCase()} viewing consistency`);
        if (hasUsbC) pros.push('USB‑C convenience for laptops');
    }

    const cons: string[] = [];
    if (catNormalized.includes('motherboard')) {
        cons.push('Front‑panel USB/headers vary by case');
        cons.push('Overclocking headroom depends on cooling and CPU');
    } else {
        if (hdrGrade) cons.push('HDR at this tier is limited');
        cons.push('No true HDR dimming zones');
    }

    const prosCons = [
        pros.length ? `Pros:\n- ${pros.join('\n- ')}` : '',
        cons.length ? `Cons:\n- ${cons.join('\n- ')}` : ''
    ].filter(Boolean).join('\n');

    const verdict = catNormalized.includes('motherboard')
        ? `Bottom line: a dependable board with the right I/O for modern builds—shortlist it and check current pricing against close rivals.`
        : `Bottom line: this monitor is an easy shortlist pick—check current pricing and compare against a close rival before you decide.`;

    return [...blocks, specLine, whoFor, prosCons, verdict]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
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

// Sanitize HTML by removing script, style, and other non-content tags
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ') // a bit aggressive, but removes leftover tags
        .replace(/\s+/g, ' ')
        .trim();
}

// Clean up AI-generated text from common code artifacts
function cleanAiOutput(text: string): string {
    if (!text) return '';
    return text
        .replace(/P\.when\([^)]+\)\.execute\([^)]+\);?/gi, '')
        .replace(/var\s+\w+\s*=\s*[^;]+;/gi, '')
        .replace(/A\.declarative\([^)]+\);?/gi, '')
        .replace(/if\s*\([^)]+\)\s*\{[^}]+\}/gi, '')
        .replace(/ue\.count\([^)]+\);?/gi, '')
        .replace(/window\.ue\s*=\s*window\.ue\s*\|\|\s*\{\};/gi, '')
        .replace(/\(function\([\s\S]*?\)\)\s*;?/gi, '')
        .replace(/See more\.?/gi, '')
        .replace(/4\.5 out of 5 stars/gi, '') // common noise
        .replace(/\s+/g, ' ')
        .trim();
}

function sanitizeTitle(raw: string): string {
    if (!raw) return '';
    let t = raw.trim();
    t = t.replace(/^Amazon\.(com|co\.uk)\s*:?\s*/i, '');
    t = t.replace(/\s*:\s*Amazon\.(com|co\.uk).*$/i, '');
    t = t.replace(/\s*\|\s*Amazon\.(com|co\.uk).*$/i, '');
    t = t.replace(/\s*:\s*Electronics.*$/i, '');
    return t.trim();
}

// Generate a clean affiliate link with the correct tag for OneLink
function generateAffiliateLink(url: string): string {
    const asin = extractASIN(url);
    if (!asin) return url; // Return original if no ASIN found

    // Always generate the amazon.com link and use the US tag for OneLink to handle redirection
    const tag = AMAZON_TAG_US;
    return `https://www.amazon.com/dp/${asin}${tag ? `?tag=${tag}` : ''}`;
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
                const apiKey = process.env.SCRAPER_API_KEY;
                const fetchUrl = apiKey ? `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(input)}` : input;

                const pageResponse = await fetch(fetchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                    }
                });
                const html = await pageResponse.text();
                const cleanHtml = sanitizeHtml(html);

                // Extract images from HTML only (avoid guessing Amazon image URLs from ASIN which often 404)
                const htmlImages = extractImagesFromHTML(html);
                imageUrls = [...htmlImages];

                // Validate images
                imageUrls = await validateImages(imageUrls);

                // De-duplicate Amazon images, keeping the highest resolution found for each unique image
                const uniqueImages = new Map<string, string>();
                const getSize = (url: string): number => {
                    const match = url.match(/\._S[LXY](\d+)_/i);
                    // Treat base images (no size token) as highest priority/resolution
                    return match ? parseInt(match[1], 10) : 9999;
                };

                for (const url of imageUrls) {
                    const base = getAmazonImageBase(url);
                    const existingUrl = uniqueImages.get(base);

                    if (!existingUrl || getSize(url) > getSize(existingUrl)) {
                        uniqueImages.set(base, url);
                    }
                }
                imageUrls = Array.from(uniqueImages.values());


                // Extract basic data from HTML first
                const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
                const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1];
                const title = sanitizeTitle(titleMatch ? titleMatch[1] : (ogTitle || '')) || '';
                const brand = extractBrand(html, title);
                const price = extractPrice(html);
                const specMap = extractAmazonSpecs(html);
                const specsInline = Object.entries(specMap).map(([k,v]) => `${k}: ${v}`).join(', ');
                
                // AI extraction with better context
                if (ai) {
                    try {
                        const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
                        const prompt = `You are a senior tech reviewer with a helpful, benefit‑led style. Your goal is to help readers decide quickly with clear reasons to choose (or skip) a product—confident and persuasive without hype. Use an energetic, positive tone while staying honest.

You're reviewing this product: ${title}
Brand: ${brand}
Price: ${price}
URL: ${input}
Parsed Specifications (from page): ${specsInline || 'None detected'}

Your assignment:
1. Product name (clean, marketing‑friendly, ≤60 chars). Drop long spec chains, trademarks, and warranty text. Avoid parentheses unless it’s the core model ID.
2. Brand identification
3. Category (specific tech category like "GPU", "CPU", "Keyboard", "Mouse", "Monitor", "Headphones", etc.)
4. Price in USD format like "$XXX.XX"
5. Detailed specifications based on your expertise and any specs found on the page (format as "Key: Value, Key: Value")
6. Write a professional review (230–320 words). Structure it exactly as:
   - 2–3 sentence intro that frames the core benefit/outcome
   - Performance and build (what it feels like to use)
   - Who it’s for (and who should skip)
   - Pros and Cons (3 concise bullets each; prefix bullets with "- ")
   - Verdict with a soft CTA (e.g., "worth shortlisting", "check current price") without hard-selling
7. SEO title (under 60 chars, include brand and key feature)
8. SEO description (under 155 chars, compelling summary)
9. URL-friendly slug (lowercase, hyphens, no special chars)

WRITING STYLE:
 - Benefit‑led and outcome‑oriented; tangible advantages the reader gets
 - Honest trade‑offs; avoid hype words unless you justify them
 - Use everyday technical language; avoid invented numbers/benchmarks
 - Compare briefly to a close alternative when it clarifies value
 - Persuasive but respectful—no overpromises, no pushy sales tone
  - Don’t repeat the full product name inside the review body; use category nouns ("this monitor", "this keyboard") after the first mention
  - Make the reader feel good about choosing it: pride of ownership, peace of mind, and sensible, future‑proof value
  - Positive language is welcome—make it feel exciting when justified

CATEGORY FOCUS (adapt based on detected category):
 - Monitor/Display: panel type, refresh rate/motion clarity, VRR (G‑Sync/FreeSync), HDR grade realism (e.g., HDR400 is entry‑level), color accuracy, ergonomics, ports.
 - Keyboard: switch feel, stabilizers, layout, build, acoustics.
 - Mouse: sensor accuracy, shape/weight, buttons/scroll, feet.
 - PSU: efficiency rating, acoustics, cabling, build.

HTML Content (first 40k chars):
${cleanHtml.substring(0, 40000)}

Return ONLY valid JSON with these exact keys: name, brand, category, price, specifications, review, seoTitle, seoDescription, slug, affiliateLink`;
                        
                        const result = await model.generateContent(prompt);
                        const jsonText = result.response.text().replace(/```json|```/g, '').trim();
                        productData = JSON.parse(jsonText);
                        
                        // Clean up potential code garbage in specs and review
                        if (productData.specifications) {
                            productData.specifications = cleanAiOutput(productData.specifications);
                        }
                        if (productData.review) {
                            productData.review = cleanAiOutput(productData.review);
                        }

                        // Ensure essential fields and merge extracted specs/price when missing
                        if (!productData.name || productData.name.length < 3) productData.name = title || 'Product from URL';
                        if (!productData.brand) productData.brand = brand || productData.name.split(' ')[0] || '';
                        if (!productData.price || !/^[£$€]/.test(productData.price)) productData.price = price;
                        if (!productData.specifications && specsInline) productData.specifications = specsInline;
                        if (!productData.slug) productData.slug = (productData.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        if (!productData.review || productData.review.split(/\s+/).length < 170) {
                            try {
                                // Second AI pass: expand/refresh the review to target length and tone
                                const refinePrompt = `Rewrite the following product review to be a fresh, professional review of 230–320 words with an energetic but honest tone. Structure: brief intro on core benefit, performance/build, who it’s for (and who should skip), 3 pros and 3 cons as - bullets, and a soft verdict CTA. Make it feel good to own: pride of ownership, peace of mind, and future‑proof value. Do not repeat the full long product name—use category nouns after first mention. Avoid invented metrics.

Product: ${productData.name}
Brand: ${productData.brand}
Category: ${productData.category}
Price: ${productData.price}
Key specs: ${(Object.entries(specMap).slice(0,6).map(([k,v]) => `${k}: ${v}`)).join(', ')}

Original (may be short or messy):\n${productData.review || '(none)'}\n\nReturn ONLY the rewritten review as plain text.`;
                                const refine = await model.generateContent(refinePrompt);
                                const refinedText = cleanAiOutput(refine.response.text());
                                const wc = refinedText.split(/\s+/).filter(Boolean).length;
                                if (wc >= 170) {
                                    productData.review = refinedText;
                                } else {
                                    productData.review = expandReviewIfShort(refinedText, productData.name, productData.brand, productData.category || 'tech', specMap);
                                }
                            } catch {
                                productData.review = expandReviewIfShort(productData.review || '', productData.name, productData.brand, productData.category || 'tech', specMap);
                            }
                        }
                        // Always generate our clean affiliate link
                        productData.affiliateLink = generateAffiliateLink(input);
                        productData = normalizeSeo(productData);
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
                            affiliateLink: generateAffiliateLink(input)
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
                        affiliateLink: generateAffiliateLink(input)
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
                    const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
                    const prompt = `Generate product details for: ${input}.
Return ONLY JSON with keys: name, brand, category, price (USD like "$XXX.XX"), specifications (comma-separated key: value pairs), review (150-220 words; include a short Pros and Cons segment inside the review using "- " bullets), seoTitle (<=60 chars), seoDescription (<=155 chars), slug (URL-friendly), affiliateLink.`;
                    const result = await model.generateContent(prompt);
                    const jsonText = result.response.text().replace(/```json|```/g, '').trim();
                    productData = JSON.parse(jsonText);
                    // Name-only doesn't have a URL, so clear affiliate link
                    productData.affiliateLink = '';
                    productData.price = normalizePrice(productData.price);
                    productData = normalizeSeo(productData);
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
            brand: productData.brand || guessBrand(productData.name || input),
            category: canonicalCategory(productData.name || input, productData.category || ''),
            price: normalizePrice(productData.price || '$0.00'),
            specifications: productData.specifications || '',
            review: productData.review || 'Review pending...',
            seoTitle: clamp(productData.seoTitle || `${productData.name} | Review & Specs`, 60),
            seoDescription: clamp(productData.seoDescription || `Explore ${productData.name}: key specs, pricing, and quick AI-style summary.`, 155),
            slug: productData.slug || productData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '',
            affiliateLink: productData.affiliateLink || (isUrl ? generateAffiliateLink(input) : ''),
            imageUrls: imageUrls.slice(0, 10) // Limit to 10 images
        };

        return res.status(200).json(finalProduct);

    } catch (error: any) {
        console.error('build-product error:', error);
        return res.status(500).json({ error: 'Failed to build product', details: error?.message || String(error) });
    }
}

export const config = { runtime: 'nodejs' };
