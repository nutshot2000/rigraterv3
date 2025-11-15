import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const BASE_URL = 'https://www.rigrater.tech';

async function buildSitemapXml() {
  const nowIso = new Date().toISOString();
  const urls: { loc: string; lastmod: string; changefreq: string; priority: number }[] = [
    { loc: BASE_URL, lastmod: nowIso, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE_URL}/blog`, lastmod: nowIso, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/deals`, lastmod: nowIso, changefreq: 'hourly', priority: 0.9 },
  ];

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return buildXml(urls);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at');
    if (products && Array.isArray(products)) {
      products.forEach((p: any) => {
        if (!p.slug) return;
        urls.push({
          loc: `${BASE_URL}/products/${p.slug}`,
          lastmod: new Date(p.updated_at || nowIso).toISOString(),
          changefreq: 'weekly',
          priority: 0.9,
        });
      });
    }
  } catch (e) {
    console.error('Error fetching products for sitemap:', e);
  }

  try {
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at');
    if (posts && Array.isArray(posts)) {
      posts.forEach((p: any) => {
        if (!p.slug) return;
        urls.push({
          loc: `${BASE_URL}/blog/${p.slug}`,
          lastmod: new Date(p.updated_at || nowIso).toISOString(),
          changefreq: 'monthly',
          priority: 0.7,
        });
      });
    }
  } catch (e) {
    console.error('Error fetching blog posts for sitemap:', e);
  }

  return buildXml(urls);
}

function buildXml(urls: { loc: string; lastmod: string; changefreq: string; priority: number }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      const xml = await buildSitemapXml();
      return res.status(200).json({ ok: true, stored: false, length: xml.length });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const xml = await buildSitemapXml();

    await supabase.from('sitemap_snapshots').insert({ xml });

    return res.status(200).json({ ok: true, stored: true, length: xml.length });
  } catch (error: any) {
    console.error('Failed to regenerate sitemap:', error);
    return res.status(500).json({ error: 'Failed to regenerate sitemap', details: error?.message || String(error) });
  }
}


