export const config = { runtime: 'nodejs' };
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Shared helpers (also used for metadata mode) ---
function extractJsonLdProduct(html: string): any {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    try {
      const json = JSON.parse(m[1].trim());
      const nodes = Array.isArray(json) ? json : [json];
      for (const n of nodes) {
        if (!n) continue;
        if (n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product'))) return n;
        if (Array.isArray(n['@graph'])) {
          const p = n['@graph'].find((x: any) => x['@type'] === 'Product');
          if (p) return p;
        }
      }
    } catch {}
  }
  return null;
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

function extractAmazonSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
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
  return specs;
}

function extractPrice(html: string): string {
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

  const blocks: RegExp[] = [
    /id=["']apex_priceToPay["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
    /id=["']corePrice_feature_div["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
    /id=["']corePriceDisplay_desktop_feature_div["'][\s\S]*?class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*([^<]+)/i,
  ];
  for (const re of blocks) {
    const m = html.match(re);
    if (m && m[1]) {
      const raw = m[1].replace(/\s+/g, '').replace(/&nbsp;/g, '');
      if (/^£|^\$|^€/.test(raw)) return raw;
      if (/^\d/.test(raw)) return `$${raw}`;
    }
  }

  return '$0.00';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, mode } = req.body || {};
    if (mode !== 'review' && !url) return res.status(400).json({ error: 'url is required' });

    // Short-circuit: review regeneration does not require fetching the URL
    if (mode === 'review') {
      const { name, brand, category, specifications, prior } = req.body || {};
      const GEMINI_KEY = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_key || '').trim();
      const GEMINI_MODEL = (process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash').trim();
      if (!GEMINI_KEY) return res.status(500).json({ error: 'AI service not configured' });
      const ai = new GoogleGenerativeAI(GEMINI_KEY);
      const model = ai.getGenerativeModel({ model: GEMINI_MODEL });
      const prompt = `Rewrite the product review with variety and specificity.

Product:
- Name: ${name}
- Brand: ${brand}
- Category (one of a fixed set like CPU, GPU, Motherboard, RAM, Storage, Case, CPU COOLER, PSU, Keyboard, Mouse, Monitor, Headset, Microphone, Thermal Paste, Chair): ${category}
- Specifications: ${specifications}

Requirements:
- 200–260 words, natural paragraphs, no fluff or generic phrases.
- Avoid using wording like "balanced tech pick", "easy shortlist pick", or any monitor-specific language unless category is Monitor.
- Be specific: mention 2–4 concrete details from the specs when useful.
- Include a short Pros and Cons section (3 bullets each) using "- " bullets.
- End with a calm, useful verdict.

Previous text (avoid reusing phrasing): ${prior || ''}

Return only the new review as plain text.`;
      const result = await model.generateContent(prompt);
      const review = (result.response.text() || '').trim();
      return res.status(200).json({ review });
    }

    const apiKey = process.env.SCRAPER_API_KEY;
    const fetchUrl = apiKey ? `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}` : url;

    let resp = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    let html = await resp.text();
    let price = extractPrice(html);
    let source = apiKey ? 'proxy' : 'direct';

    if (price === '$0.00' || /continue shopping|add this item to your cart|bot detection/i.test(html)) {
      try {
        const alt = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
        const altHtml = await alt.text();
        const p2 = extractPrice(altHtml);
        if (p2 && p2 !== '$0.00') price = p2;
        source = 'googlebot-fallback';
      } catch {}
    }
    // Metadata mode
    if (mode === 'meta') {
      const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1];
      const name = sanitizeTitle(titleMatch ? titleMatch[1] : (ogTitle || '')) || '';
      const brand = extractBrand(html, name);
      const specs = extractAmazonSpecs(html);
      console.log(`[fetch-meta] source=${source} name=${!!name} brand=${!!brand} specs=${Object.keys(specs).length}`);
      return res.status(200).json({ name, brand, specifications: Object.entries(specs).map(([k,v])=>`${k}: ${v}`).join(', ') });
    }

    // (review mode handled above without fetching)

    console.log(`[fetch-price] source=${source} price=${price}`);
    return res.status(200).json({ price });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch price', details: e?.message || String(e) });
  }
}


