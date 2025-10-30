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
