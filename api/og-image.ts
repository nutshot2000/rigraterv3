import { supabase } from '../services/supabaseClient';

export const config = { runtime: 'nodejs' };

function escapeXml(s: string) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req: any, res: any) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const slug = url.searchParams.get('slug') || '';
    if (!slug) {
      res.status(400).send('Missing slug');
      return;
    }

    const { data, error } = await (supabase as any)
      .from('products')
      .select('name, price, brand, image_url')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      res.status(404).send('Not found');
      return;
    }

    const name: string = data.name || 'Product';
    const brand: string = data.brand || '';
    const price: string = data.price || '';
    const img = data.image_url || '';

    // Use our proxy to avoid hotlink restrictions
    const proxied = img
      ? `/api/proxy-image?url=${encodeURIComponent(img)}`
      : 'https://placehold.co/1200x630/0b1220/85e7f2/png?text=RIGRATER';

    const title = escapeXml(name);
    const subtitle = escapeXml([brand, price].filter(Boolean).join(' • '));

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#0e1b2e"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g>
    <rect x="60" y="60" width="520" height="510" rx="16" fill="#0f172a" filter="url(#shadow)"/>
    <image href="${proxied}" x="60" y="60" width="520" height="510" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <g>
    <rect x="620" y="130" width="520" height="260" fill="none"/>
    <text x="620" y="220" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="52" fill="#e2e8f0">${title}</text>
    <text x="620" y="290" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="32" fill="#94a3b8">${subtitle}</text>
  </g>
  <g>
    <text x="620" y="460" font-family="Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="28" fill="#67e8f9">rigrater.tech</text>
  </g>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
  } catch (e) {
    res.status(500).send('Failed to generate OG image');
  }
}


