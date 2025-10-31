import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost, Product } from '../types';
import { fetchBlogPostBySlug } from '../services/blogService';
import { fetchProductById } from '../services/productService';
import { FALLBACK_IMAGE_URL } from '../constants';
import ProductCard from '../components/public/ProductCard';
import BuyButtons from '../components/public/BuyButtons';

const ProductEmbed: React.FC<{ id: string }> = ({ id }) => {
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
        const getProduct = async () => {
            const p = await fetchProductById(id);
            setProduct(p);
        };
        getProduct();
    }, [id]);

    if (!product) return <div className="text-center my-8 text-slate-400">Loading product...</div>;

    return (
        <div className="not-prose my-8">
            <ProductCard product={product} onCardClick={() => {}} onAddToComparison={() => {}} isInComparison={false} />
        </div>
    );
};

function parseAffiliateLinks(content: string): { body: string; links: string[] } {
    const m = content.match(/\[links\]([\s\S]*?)\[\/links\]/i);
    if (!m) return { body: content, links: [] };
    const block = m[0];
    const links = m[1]
      .split(/\r?\n|,/) 
      .map(s => s.trim())
      .filter(s => /^https?:\/\//i.test(s));
    const body = content.replace(block, '').trim();
    return { body, links };
}

function removeTitleFromContent(content: string, title: string): string {
    if (!content || !title) return content;
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.startsWith('# ')) {
        const headingText = firstLine.substring(2).trim();
        if (headingText.toLowerCase() === title.toLowerCase().trim()) {
            return lines.slice(1).join('\n').trim();
        }
    }
    return content;
}

const BlogPostPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setError('No post specified');
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                setLoading(true);
                const p = await fetchBlogPostBySlug(slug);
                if (!p) {
                    setError('Post not found');
                } else {
                    setPost(p);
                }
            } catch (e: any) {
                setError(e.message || 'Failed to load post');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading Post…</div>;
    }

    if (error || !post) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Could Not Load Post</h1>
                <p className="text-slate-400 mb-6">{error}</p>
                <Link to="/blog" className="btn-blueprint btn-blueprint--primary">Back to Blog</Link>
            </div>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.rigrater.tech';
    const pageUrl = `${origin}/blog/${post.slug}`;
    const ogTitle = `${post.seoTitle || post.title} | RIGRATER Blog`;
    const ogDesc = post.seoDescription || post.summary || '';
    const ogImage = post.coverImageUrl ? `/api/proxy-image?url=${encodeURIComponent(post.coverImageUrl)}` : FALLBACK_IMAGE_URL;

    const { body, links } = parseAffiliateLinks(post.content || '');
    const contentWithoutTitle = removeTitleFromContent(body, post.title);

    return (
        <>
            <Helmet>
                <title>{ogTitle}</title>
                <meta name="description" content={ogDesc} />
                <link rel="canonical" href={pageUrl} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={ogTitle} />
                <meta property="og:description" content={ogDesc} />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:image" content={origin + ogImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={ogTitle} />
                <meta name="twitter:description" content={ogDesc} />
                <meta name="twitter:image" content={origin + ogImage} />
            </Helmet>

            <article className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white leading-tight">{post.title}</h1>
                    <p className="text-slate-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>

                {post.coverImageUrl && (
                    <div className="rounded-lg overflow-hidden border border-slate-700 mb-8 bg-slate-800/50">
                        <img
                            src={`/api/proxy-image?url=${encodeURIComponent(post.coverImageUrl)}`}
                            alt={post.title}
                            className="w-full h-80 object-contain"
                            onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                if ((img as any)._triedDirect !== true) {
                                    (img as any)._triedDirect = true;
                                    img.src = post.coverImageUrl; // try direct URL
                                } else {
                                    img.src = FALLBACK_IMAGE_URL; // final fallback
                                }
                            }}
                        />
                    </div>
                )}
                
                {/* Image Gallery */}
                {post.blog_images && post.blog_images.length > 0 && (
                    <div className="my-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {post.blog_images.map((url, idx) => (
                            url.trim() && (
                                <div key={idx} className="rounded-lg overflow-hidden border border-slate-700">
                                    <img 
                                        src={`/api/proxy-image?url=${encodeURIComponent(url)}`} 
                                        alt={`${post.title} gallery image ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const img = e.currentTarget as HTMLImageElement;
                                            if ((img as any)._triedDirect !== true) {
                                                (img as any)._triedDirect = true;
                                                img.src = url; // try direct URL
                                            } else {
                                                img.src = FALLBACK_IMAGE_URL; // final fallback
                                            }
                                        }}
                                    />
                                </div>
                            )
                        ))}
                    </div>
                )}

                <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: (paragraph) => {
                                const { node } = paragraph;
                                const textChild = node.children[0];
                                if (textChild && textChild.type === 'text') {
                                    const match = /\[product id=\"([^\"]+)\"\]/.exec(textChild.value);
                                    if (match) {
                                        return <ProductEmbed id={match[1]} />;
                                    }
                                }
                                return <p>{paragraph.children}</p>;
                            },
                        }}
                    >
                        {contentWithoutTitle}
                    </ReactMarkdown>
                </div>

                {links.length > 0 && (
                    <div className="not-prose mt-8 flex flex-col gap-3">
                        {links.map((u, idx) => (
                            <BuyButtons key={idx} affiliateLink={u} productName={post.title} productCategory={'BLOG'} variant="amazon" />
                        ))}
                    </div>
                )}
            </article>
        </>
    );
};

export default BlogPostPage;
