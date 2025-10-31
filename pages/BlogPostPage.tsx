import React, { useEffect, useState, useCallback, useRef } from 'react';
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

// ------- helpers (existing) -------
const ProductEmbed: React.FC<{ id: string }> = ({ id }) => {
    const [product, setProduct] = useState<Product | null>(null);

    useEffect(() => {
        const getProduct = async () => {
            const p = await fetchProductById(id);
            setProduct(p);
        };
        getProduct();
    }, [id]);

    if (!product) return <div className="not-prose my-8 text-center text-slate-400">Loading product...</div>;

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

function parseGallery(content: string): { body: string; images: string[] } {
    if (!content) return { body: content, images: [] };
    const m = content.match(/\[gallery\]([\s\S]*?)\[\/gallery\]/i);
    if (!m) return { body: content, images: [] };
    const block = m[0];
    const images = m[1]
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => /^https?:\/\//i.test(s));
    const body = content.replace(block, '').trim();
    return { body, images };
}

function captionFromUrl(url: string, fallback: string): string {
    try {
        const noQuery = url.split('?')[0];
        const file = noQuery.substring(noQuery.lastIndexOf('/') + 1);
        const base = file.replace(/\.[a-z0-9]+$/i, '');
        const cleaned = base.replace(/[\-_]+/g, ' ').trim();
        if (!cleaned) return fallback;
        return cleaned.length > 2 ? cleaned : fallback;
    } catch {
        return fallback;
    }
}

// ------- page -------
const BlogPostPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // slideshow/lightbox state
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // reading progress & top button
    const [progress, setProgress] = useState(0);
    const [showTop, setShowTop] = useState(false);
    const articleRef = useRef<HTMLDivElement | null>(null);

    // Derived values are computed later after post is loaded

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
                if (!p) setError('Post not found');
                else setPost(p);
            } catch (e: any) {
                setError(e.message || 'Failed to load post');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [slug]);

    // reading progress
    useEffect(() => {
        const onScroll = () => {
            const el = articleRef.current;
            const vh = window.innerHeight;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const total = rect.height - vh;
            const read = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
            const pct = Math.max(0, Math.min(1, total > 0 ? read / total : 1));
            setProgress(pct);
            setShowTop(window.scrollY > 300);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Defer early returns until after hooks to keep hook order stable across renders
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

    // Compute derived content now that post exists
    const affiliateParsed = parseAffiliateLinks(post.content || '');
    const contentWithoutTitle = removeTitleFromContent(affiliateParsed.body, post.title);
    const galleryParsed = parseGallery(contentWithoutTitle);
    const body = galleryParsed.body;
    const links = affiliateParsed.links;
    const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
    const allImages = dedupe([post.coverImageUrl, ...(post.blogImages || []), ...(galleryParsed.images || [])]);
    const captions = allImages.map(u => captionFromUrl(u, post.title || ''));

    useEffect(() => {
        if (allImages.length > 0 && !activeImage) {
            setActiveImage(allImages[0]);
        }
    }, [allImages, activeImage]);

    // Keyboard navigation handler
    const handleKeyboardNav = useCallback((e: KeyboardEvent) => {
        if (!allImages.length) return;
        const idx = allImages.findIndex(u => u === activeImage);
        if (e.key === 'Escape') {
            setLightboxOpen(false);
        } else if (e.key === 'ArrowRight') {
            const nextIdx = (idx + 1) % allImages.length;
            setActiveImage(allImages[nextIdx]);
        } else if (e.key === 'ArrowLeft') {
            const prevIdx = (idx - 1 + allImages.length) % allImages.length;
            setActiveImage(allImages[prevIdx]);
        }
    }, [activeImage, allImages]);

    // Keyboard nav listener
    useEffect(() => {
        if (lightboxOpen) {
            window.addEventListener('keydown', handleKeyboardNav);
            return () => window.removeEventListener('keydown', handleKeyboardNav);
        }
    }, [lightboxOpen, handleKeyboardNav]);

    

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

            {/* reading progress */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800 z-40">
                <div className="h-full bg-sky-500 transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>

            <article ref={articleRef as any} className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white leading-tight">{post.title}</h1>
                    <p className="text-slate-400 mt-2">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>

                {allImages.length > 0 && (
                    <div className="mb-8">
                        {/* Main Image */}
                        <div className="rounded-lg overflow-hidden border border-slate-700 mb-4 bg-slate-800/50">
                            <img
                                src={`/api/proxy-image?url=${encodeURIComponent(activeImage || allImages[0])}`}
                                alt={post.title}
                                className="w-full h-96 object-contain cursor-zoom-in"
                                onClick={() => setLightboxOpen(true)}
                            />
                        </div>
                        {/* Caption */}
                        <p className="text-center text-slate-400 text-sm mb-4">{captions[allImages.findIndex(u => u === activeImage)] || ''}</p>

                        {/* Thumbnails */}
                        {allImages.length > 1 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {allImages.map((url, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setActiveImage(url); }}
                                        className={`rounded overflow-hidden border-2 ${activeImage === url ? 'border-sky-500' : 'border-slate-700 hover:border-slate-500'}`}
                                        title={captions[idx]}
                                    >
                                        <img src={`/api/proxy-image?url=${encodeURIComponent(url)}`} alt={`thumbnail ${idx + 1}`} className="w-20 h-20 object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: (paragraph) => {
                                const { node } = paragraph;
                                const textChild = (node as any).children[0];
                                if (textChild && (textChild as any).type === 'text') {
                                    const match = /\[product id=\"([^\"]+)\"\]/.exec((textChild as any).value);
                                    if (match) {
                                        return <ProductEmbed id={match[1]} />;
                                    }
                                }
                                return <p>{paragraph.children}</p>;
                            },
                        }}
                    >
                        {body}
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

            {/* Back to top */}
            {showTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-40 rounded-full bg-slate-800/90 border border-slate-700 text-white px-3 py-2 shadow hover:bg-slate-700"
                    title="Back to top"
                >
                    ↑ Top
                </button>
            )}

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6" onClick={() => setLightboxOpen(false)}>
                    <button className="absolute top-4 right-4 text-white bg-slate-800/80 border border-slate-700 px-3 py-1 rounded" onClick={() => setLightboxOpen(false)}>Close</button>
                    <div className="max-w-5xl w-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img src={`/api/proxy-image?url=${encodeURIComponent(activeImage || allImages[0])}`} alt={post.title} className="max-h-[80vh] w-auto object-contain" />
                    </div>
                    <p className="mt-4 text-slate-300 text-sm text-center" onClick={(e) => e.stopPropagation()}>{captions[allImages.findIndex(u => u === activeImage)] || ''}</p>
                    {allImages.length > 1 && (
                        <div className="mt-4 flex flex-wrap gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                            {allImages.map((url, idx) => (
                                <button key={idx} onClick={() => setActiveImage(url)} className={`rounded overflow-hidden border-2 ${activeImage === url ? 'border-sky-500' : 'border-slate-700 hover:border-slate-500'}`}>
                                    <img src={`/api/proxy-image?url=${encodeURIComponent(url)}`} alt={`thumb ${idx + 1}`} className="w-16 h-16 object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default BlogPostPage;