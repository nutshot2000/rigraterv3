
import React from 'react';
import { Product } from '../../types';
import { CloseIcon } from './Icons';
import { FALLBACK_IMAGE_URL, AMAZON_TAG_US, AMAZON_TAG_UK } from '../../constants';

// Helper function to proxy image URLs
const getProxiedImageUrl = (url: string) => {
    if (!url) return FALLBACK_IMAGE_URL;
    if (url.startsWith('/api/proxy-image')) return url;
    if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    return url;
};

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
    const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const el = e.currentTarget;
        const src = el.src;
        // Try resolving a working variant via API first
        try {
            const resp = await fetch('/api/resolve-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: [src] })
            });
            if (resp.ok) {
                const data = await resp.json();
                const candidate = Array.isArray(data.valid) && data.valid[0];
                if (candidate && candidate !== src) {
                    el.src = candidate;
                    return;
                }
            }
        } catch {}
        el.src = FALLBACK_IMAGE_URL;
        el.onerror = null;
    };

    const allImages = (product.imageUrls && product.imageUrls.length > 0) 
        ? product.imageUrls 
        : (product.imageUrl ? [product.imageUrl] : []);

    const primaryImage = allImages[0] || FALLBACK_IMAGE_URL;
    const additionalImages = allImages.slice(1);

    const specificationsSafe = (product.specifications || '').split(',');
    const reviewSafe = product.review || '';

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-start justify-center z-[80] px-4 pt-24 pb-4" onClick={onClose}>
            <div 
                className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-intermediate max-h-[calc(100vh-7rem)] overflow-hidden relative border border-slate-700/50 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 z-20 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all duration-200"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="overflow-y-auto max-h-[calc(100vh-7rem)] p-6 md:p-8">
                    {/* Primary Image */}
                    <div className="mb-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <img 
                            src={getProxiedImageUrl(primaryImage)} 
                        alt={product.name} 
                            className="w-full max-h-80 object-contain rounded"
                        onError={handleImageError}
                      />
                    </div>

                    {/* Header Info */}
                    <div className="mb-6 text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">{product.name}</h1>
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="text-sm text-slate-400 uppercase tracking-wider">{product.category}</span>
                            {product.brand && (
                                <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                                    {product.brand}
                                </span>
                            )}
                        </div>
                        <div className="text-4xl font-bold text-sky-400">{product.price}</div>
                    </div>

                    {/* Specifications */}
                    {specificationsSafe.length > 1 && (
                        <ContentSection title="Specifications">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                {specificationsSafe.map((spec, index) => {
                                    if (!spec.trim()) return null;
                                    const [key, ...valueParts] = spec.split(':');
                                    const value = valueParts.join(':').trim();
                                    return (
                                        <div key={index} className="flex justify-between items-baseline py-1 border-b border-slate-800">
                                            <span className="text-slate-400 font-medium text-sm">{key?.trim()}</span>
                                            <span className="text-white font-semibold text-sm text-right">{value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </ContentSection>
                    )}

                    {/* Additional Image 1 */}
                    {additionalImages.length > 0 && (
                        <div className="my-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <img src={getProxiedImageUrl(additionalImages[0])} alt={`${product.name} alternate view 1`} className="w-full max-h-80 object-contain rounded" onError={handleImageError} />
                        </div>
                    )}

                    {/* AI Review */}
                    {reviewSafe && (
                        <ContentSection title="AI Review">
                            <p className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{reviewSafe}</p>
                        </ContentSection>
                    )}

                    {/* Additional Image 2 */}
                    {additionalImages.length > 1 && (
                        <div className="my-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <img src={getProxiedImageUrl(additionalImages[1])} alt={`${product.name} alternate view 2`} className="w-full max-h-80 object-contain rounded" onError={handleImageError} />
                        </div>
                    )}

                    {/* Buy Buttons */}
                    <div className="pt-6">
                        <BuyButtons affiliateLink={product.affiliateLink} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ContentSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
            <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
            {title}
        </h3>
        <div className="pl-5">{children}</div>
    </div>
);

export default ProductDetailModal;

const enrichAmazonLink = (url: string, tag: string): string => {
    try {
        const u = new URL(url);
        if (!tag) return url;
        if (u.hostname.includes('amazon.')) {
            // Canonicalize to product path if possible
            // Remove tracking params; keep our tag
            u.searchParams.set('tag', tag);
            return u.toString();
        }
        return url;
    } catch {
        return url;
    }
};

import { useApp } from '../../context/AppContext';

const BuyButtons: React.FC<{ affiliateLink: string }> = ({ affiliateLink }) => {
    const { preferredRegion } = useApp();
    const us = AMAZON_TAG_US ? enrichAmazonLink(affiliateLink, AMAZON_TAG_US) : affiliateLink;
    const ukBase = affiliateLink.includes('amazon.co.uk') ? affiliateLink : affiliateLink.replace('amazon.com', 'amazon.co.uk');
    const uk = AMAZON_TAG_UK ? enrichAmazonLink(ukBase, AMAZON_TAG_UK) : '';
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                Buy Now
            </h3>
            <div className="pl-5 flex flex-col sm:flex-row gap-3">
                {preferredRegion === 'UK' && uk ? (
                    <>
                        <a href={uk} target="_blank" rel="noopener noreferrer" className="btn-blueprint btn-blueprint--primary flex-1 justify-center py-3 text-base">Buy on Amazon (UK)</a>
                        <a href={us} target="_blank" rel="noopener noreferrer" className="btn-blueprint flex-1 justify-center py-3 text-base">Buy on Amazon (US)</a>
                    </>
                ) : (
                    <>
                        <a href={us} target="_blank" rel="noopener noreferrer" className="btn-blueprint btn-blueprint--primary flex-1 justify-center py-3 text-base">Buy on Amazon (US)</a>
                        {uk && (
                            <a href={uk} target="_blank" rel="noopener noreferrer" className="btn-blueprint flex-1 justify-center py-3 text-base">Buy on Amazon (UK)</a>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
