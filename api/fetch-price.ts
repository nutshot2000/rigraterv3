export const config = { runtime: 'nodejs' };

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
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });

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
    console.log(`[fetch-price] source=${source} price=${price}`);

    return res.status(200).json({ price });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch price', details: e?.message || String(e) });
  }
}


