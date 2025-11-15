import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const BASE_URL = 'https://www.rigrater.tech';

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

async function generateOnTheFly() {
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
    const { data: products } = await supabase.from('products').select('slug, updated_at');
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
    console.error('Error fetching products for sitemap (on the fly):', e);
  }

  try {
    const { data: posts } = await supabase.from('blog_posts').select('slug, updated_at');
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
    console.error('Error fetching blog posts for sitemap (on the fly):', e);
  }

  return buildXml(urls);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  try {
    let xml: string | null = null;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase
        .from('sitemap_snapshots')
        .select('xml, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.xml) {
        xml = data.xml as string;
      }
    }

    if (!xml) {
      xml = await generateOnTheFly();
    }

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to serve sitemap.xml:', error);
    res.status(500).send('Failed to generate sitemap');
  }
}

import { supabase } from '../services/supabaseClient';

export const config = {
  runtime: 'nodejs',
};

const BASE_URL = 'https://www.rigrater.tech'; // Replace with your actual domain

async function generateSitemap() {
    const urls = [];

    // Add static pages
    urls.push({ loc: BASE_URL, lastmod: new Date().toISOString(), changefreq: 'daily', priority: 1.0 });
    urls.push({ loc: `${BASE_URL}/blog`, lastmod: new Date().toISOString(), changefreq: 'weekly', priority: 0.8 });
    
    // Add dynamic product pages
    const { data: products } = await supabase
        .from('products')
        .select('slug, updated_at, created_at');

    if (products) {
        products.forEach(product => {
            const lm = product.updated_at || product.created_at || new Date().toISOString();
            urls.push({
                loc: `${BASE_URL}/products/${product.slug}`,
                lastmod: new Date(lm).toISOString(),
                changefreq: 'weekly',
                priority: 0.9
            });
        });
    }

    // Add dynamic blog pages
    const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, created_at');
    
    if (blogPosts) {
        blogPosts.forEach(post => {
            const lm = post.updated_at || post.created_at || new Date().toISOString();
            urls.push({
                loc: `${BASE_URL}/blog/${post.slug}`,
                lastmod: new Date(lm).toISOString(),
                changefreq: 'monthly',
                priority: 0.7
            });
        });
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(url => `
        <url>
          <loc>${url.loc}</loc>
          <lastmod>${url.lastmod}</lastmod>
          <priority>${url.priority}</priority>
          <changefreq>${url.changefreq}</changefreq>
        </url>
      `).join('')}
    </urlset>`;
    
    return sitemap;
}

export default async function handler(req: any, res: any) {
    try {
        const sitemap = await generateSitemap();
        res.setHeader('Content-Type', 'application/xml');
        res.status(200).send(sitemap);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
}
