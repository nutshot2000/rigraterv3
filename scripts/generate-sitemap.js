import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const BASE_URL = 'https://www.rigrater.tech';

async function generateSitemap() {
    console.log('🔄 Generating sitemap.xml at build time...');
    
    // Initialize URLs with static pages
    const nowIso = new Date().toISOString();
    const urls = [
        { loc: BASE_URL, lastmod: nowIso, changefreq: 'daily', priority: 1.0 },
        { loc: `${BASE_URL}/blog`, lastmod: nowIso, changefreq: 'weekly', priority: 0.8 },
        { loc: `${BASE_URL}/deals`, lastmod: nowIso, changefreq: 'hourly', priority: 0.9 },
    ];

    try {
        // Only connect to Supabase if credentials are available
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Add dynamic product pages
            try {
                const { data: products } = await supabase
                    .from('products')
                    .select('slug, updated_at');
                
                if (products && products.length > 0) {
                    console.log(`📦 Found ${products.length} products for sitemap`);
                    products.forEach(product => {
                        urls.push({
                            loc: `${BASE_URL}/products/${product.slug}`,
                            lastmod: new Date(product.updated_at || new Date()).toISOString(),
                            changefreq: 'weekly',
                            priority: 0.9
                        });
                    });
                }
            } catch (error) {
                console.error('⚠️ Error fetching products:', error.message);
            }
            
            // Add dynamic blog post pages
            try {
                const { data: blogPosts } = await supabase
                    .from('blog_posts')
                    .select('slug, updated_at');
                
                if (blogPosts && blogPosts.length > 0) {
                    console.log(`📝 Found ${blogPosts.length} blog posts for sitemap`);
                    blogPosts.forEach(post => {
                        urls.push({
                            loc: `${BASE_URL}/blog/${post.slug}`,
                            lastmod: new Date(post.updated_at || new Date()).toISOString(),
                            changefreq: 'monthly',
                            priority: 0.7
                        });
                    });
                }
            } catch (error) {
                console.error('⚠️ Error fetching blog posts:', error.message);
            }
        } else {
            console.warn('⚠️ No Supabase credentials found, using static URLs only');
        }
    } catch (error) {
        console.error('❌ Error generating sitemap:', error);
    }

    // Generate the XML content
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Write the sitemap to the public directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    
    console.log(`✅ Sitemap generated with ${urls.length} URLs: public/sitemap.xml`);
}

// Run the sitemap generator
generateSitemap()
    .then(() => console.log('✨ Sitemap generation complete'))
    .catch(error => {
        console.error('❌ Sitemap generation failed:', error);
        // Don't fail the build if sitemap generation fails
        process.exit(0);
    });
