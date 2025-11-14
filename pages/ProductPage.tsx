import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Product } from '../types';
import { fetchProductBySlug } from '../services/productService';
import { FALLBACK_IMAGE_URL } from '../constants';
import { useApp } from '../context/AppContext';
import BuyButtons from '../components/public/BuyButtons';

const ProductPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { addToast } = useApp();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setError("No product specified.");
            setLoading(false);
            return;
        };

        const loadProduct = async () => {
            try {
                setLoading(true);
                const fetchedProduct = await fetchProductBySlug(slug);
                if (!fetchedProduct) {
                    throw new Error('Product not found. It might have been moved or deleted.');
                }
                setProduct(fetchedProduct);
            } catch (err: any) {
                setError(err.message || 'Failed to load product details.');
                addToast(err.message || 'Failed to load product details.', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [slug, addToast]);

    if (loading) {
        return <div className="text-center py-20 text-slate-400">Loading Product...</div>;
    }

    if (error || !product) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold text-red-400 mb-4">Could Not Load Product</h1>
                <p className="text-slate-400 mb-6">{error}</p>
                <Link to="/" className="btn-blueprint btn-blueprint--primary">
                    Back to Homepage
                </Link>
            </div>
        );
    }

    const specifications = (product.specifications || '')
        .split(',')
        .map(spec => {
            const [key, ...valueParts] = spec.split(':');
            return { key: key.trim(), value: valueParts.join(':').trim() };
        })
        .filter(s => s.key && s.value);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.rigrater.tech';
    const pageUrl = `${origin}/products/${product.slug || slug}`;
    const ogTitle = `${product.seoTitle || product.name} | RIGRATER`;
    const ogDesc = product.seoDescription || (product.review || '').substring(0, 160);
    const ogImage = product.imageUrl ? `/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}` : FALLBACK_IMAGE_URL;

    const prosShort = Array.isArray((product as any).prosShort) ? (product as any).prosShort as string[] : [];
    const consShort = Array.isArray((product as any).consShort) ? (product as any).consShort as string[] : [];

    return (
        <>
            <Helmet>
                <title>{ogTitle}</title>
                <meta name="description" content={ogDesc} />
                {/* Canonical */}
                <link rel="canonical" href={pageUrl} />
                {/* Open Graph */}
                <meta property="og:type" content="product" />
                <meta property="og:title" content={ogTitle} />
                <meta property="og:description" content={ogDesc} />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:image" content={origin + ogImage} />
                {/* Secondary branded OG (SVG) */}
                <meta property="og:image" content={`${origin}/api/og-image?slug=${product.slug || slug}`} />
                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={ogTitle} />
                <meta name="twitter:description" content={ogDesc} />
                <meta name="twitter:image" content={origin + ogImage} />
            </Helmet>
            
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <span className="text-sm text-slate-400 uppercase tracking-wider">{product.category}</span>
                    <h1 className="text-5xl font-bold text-white leading-tight mt-1">{product.name}</h1>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 mb-8">
                    <img 
                        src={product.imageUrl ? `/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}` : FALLBACK_IMAGE_URL} 
                        alt={product.name}
                        className="w-full h-96 object-contain rounded"
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-8">
                    <div className="text-4xl font-bold text-sky-400 mb-4 sm:mb-0">{product.price}</div>
                    <BuyButtons 
                        affiliateLink={product.affiliateLink}
                        productName={product.name}
                        productCategory={product.category}
                    />
                </div>

                {(product as any).quickVerdict && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">Quick Verdict</h2>
                        <p className="text-slate-200 mb-4">{(product as any).quickVerdict}</p>
                        {(prosShort.length > 0 || consShort.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                {prosShort.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-emerald-400 mb-1">Pros</h3>
                                        <ul className="list-disc list-inside text-slate-200 space-y-1">
                                            {prosShort.map((p, idx) => <li key={idx}>{p}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {consShort.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-rose-400 mb-1">Cons</h3>
                                        <ul className="list-disc list-inside text-slate-200 space-y-1">
                                            {consShort.map((c, idx) => <li key={idx}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="prose prose-invert max-w-none mb-8">
                    <h2 className="text-3xl font-bold text-white">Review</h2>
                    <p className="text-slate-300 leading-relaxed">{product.review}</p>
                </div>

                {specifications.length > 0 && (
                     <div className="mt-12">
                        <h2 className="text-3xl font-bold text-white mb-4">Specifications</h2>
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {specifications.map(({ key, value }) => (
                                <div key={key} className="flex justify-between items-baseline border-b border-slate-700/50 py-2">
                                    <span className="text-slate-400 font-medium">{key}</span>
                                    <span className="text-white font-semibold text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ProductPage;
