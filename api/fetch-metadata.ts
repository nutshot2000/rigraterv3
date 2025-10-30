export const config = { runtime: 'nodejs' };

// Minimal helpers copied from build-product for extraction
function sanitizeTitle(raw: string): string {
  if (!raw) return '';
  let t = raw.trim();
  t = t.replace(/^Amazon\.(com|co\.uk)\s*:?\s*/i, '');
  t = t.replace(/\s*:\s*Amazon\.(com|co\.uk).*$/i, '');
  t = t.replace(/\s*\|\s*Amazon\.(com|co\.uk).*$/i, '');
  t = t.replace(/\s*:\s*Electronics.*$/i, '');
  return t.trim();
}

function extractJsonLdProduct(html: string): any {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    const text = m[1].trim();
    try {
      const parsed = JSON.parse(text);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const n of nodes) {
        if (!n) continue;
        if (n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product'))) return n;
        if (Array.isArray(n['@graph'])) {
          const p = n['@graph'].find((x: any) => x && x['@type'] === 'Product');
          if (p) return p;
        }
      }
    } catch {}
  }
  return null;
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });

    const apiKey = process.env.SCRAPER_API_KEY;
    const proxyUrl = apiKey ? `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}` : url;

    let source = apiKey ? 'proxy' : 'direct';
    let resp = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    let html = await resp.text();

    // Fallback to Googlebot direct if stripped
    if (/continue shopping|add this item to your cart|bot detection/i.test(html) || html.trim().length < 5000) {
      const alt = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
      const altHtml = await alt.text();
      if (altHtml && altHtml.length > html.length) { html = altHtml; source = 'googlebot-fallback'; }
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1];
    const name = sanitizeTitle(titleMatch ? titleMatch[1] : (ogTitle || '')) || '';
    const brand = extractBrand(html, name);
    const specs = extractAmazonSpecs(html);

    console.log(`[fetch-metadata] source=${source} name=${name ? 'ok' : 'missing'} brand=${brand ? 'ok' : 'missing'} specsKeys=${Object.keys(specs).length}`);

    return res.status(200).json({ name, brand, specifications: Object.entries(specs).map(([k,v])=>`${k}: ${v}`).join(', ') });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to fetch metadata', details: e?.message || String(e) });
  }
}


