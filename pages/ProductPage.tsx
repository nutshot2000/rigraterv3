import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Product } from '../types';
import { fetchProductBySlug } from '../services/productService';
import { FALLBACK_IMAGE_URL } from '../constants';
import { useApp } from '../context/AppContext';

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

    return (
        <>
            <Helmet>
                <title>{product.seoTitle || product.name} | RIGRATER</title>
                <meta name="description" content={product.seoDescription || product.review.substring(0, 160)} />
            </Helmet>
            
            <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                    {/* Image Column */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 self-start">
                        <img 
                            src={product.imageUrl ? `/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}` : FALLBACK_IMAGE_URL} 
                            alt={product.name}
                            className="w-full h-96 object-contain rounded"
                        />
                    </div>

                    {/* Details Column */}
                    <div>
                        <div className="mb-4">
                            <span className="text-sm text-slate-400 uppercase tracking-wider">{product.category}</span>
                            <h1 className="text-4xl font-bold text-white leading-tight mt-1">{product.name}</h1>
                        </div>
                        <div className="text-4xl font-bold text-sky-400 mb-6">{product.price}</div>
                        
                        <div className="prose prose-invert max-w-none mb-6">
                            <p className="text-slate-300">{product.review}</p>
                        </div>
                        
                        <a href={product.affiliateLink} target="_blank" rel="noopener noreferrer" className="btn-blueprint btn-blueprint--primary w-full justify-center py-3 text-lg">
                            Buy Now
                        </a>
                    </div>
                </div>

                {/* Specifications Section */}
                {specifications.length > 0 && (
                     <div className="mt-12">
                        <h2 className="text-2xl font-bold text-white mb-4">Specifications</h2>
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {specifications.map(({ key, value }) => (
                                <div key={key} className="flex justify-between items-baseline border-b border-slate-700/50 py-2">
                                    <span className="text-slate-400 font-medium text-sm">{key}</span>
                                    <span className="text-white font-semibold text-sm text-right">{value}</span>
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
