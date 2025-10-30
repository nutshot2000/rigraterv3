export const config = { runtime: 'nodejs' };

function extractJsonLdProduct(html: string): any {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
      try {
          const cleaned = m[1].trim().replace(/\u0000/g, '');
          const parsed = JSON.parse(cleaned);
          const candidates = Array.isArray(parsed) ? parsed : [parsed];
          for (const node of candidates) {
              if (!node) continue;
              if ((node['@type'] === 'Product') || (Array.isArray(node['@type']) && node['@type'].includes('Product'))) {
                  return node;
              }
              if (Array.isArray(node['@graph'])) {
                  const p = node['@graph'].find((x: any) => x && x['@type'] === 'Product');
                  if (p) return p;
              }
          }
      } catch {}
  }
  return null;
}

const GOOGLEBOT_UA = 'Mozilla/5.o (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    const resp = await fetch(url, {
      headers: {
        'User-Agent': GOOGLEBOT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await resp.text();
    const price = extractPrice(html);
    
    // Detailed logging for debugging
    console.log(`[fetch-price] URL: ${url}`);
    console.log(`[fetch-price] Extracted Price: ${price}`);
    if (price === '$0.00') {
      // console.log(`[fetch-price] Received HTML (first 1k chars): ${html.substring(0, 1000)}`);
    }

    return res.status(200).json({ price });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch price', details: e?.message || String(e) });
  }
}


