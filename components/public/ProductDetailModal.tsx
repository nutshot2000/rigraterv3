
import React from 'react';
import { Product } from '../../types';
import { CloseIcon } from './Icons';
import { FALLBACK_IMAGE_URL, AMAZON_TAG_US, AMAZON_TAG_UK } from '../../constants';

interface ProductDetailModalProps {
    product: Product;
    onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null; // Prevent infinite loops
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden relative border border-gray-700/50 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                        <span className="text-sm text-gray-400 uppercase tracking-wider">{product.category}</span>
                        {product.brand && (
                            <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-600">
                                {product.brand}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
                    <div className="grid lg:grid-cols-2 gap-0">
                        {/* Image Section */}
                        <div className="p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                            <div className="relative group">
                                <img 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="w-full h-80 object-contain rounded-xl bg-white/5 p-4 border border-gray-700/50"
                                    onError={handleImageError}
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-8 space-y-6">
                            {/* Product Info */}
                            <div>
                                <h1 className="text-3xl font-bold text-white leading-tight mb-4">{product.name}</h1>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="text-4xl font-bold text-teal-400">{product.price}</div>
                                    <button
                                        className="text-sm text-gray-400 hover:text-teal-400 transition-colors underline"
                                        onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('q', product.name);
                                            window.history.replaceState(null, '', `?${params.toString()}`);
                                        }}
                                    >
                                        Share this product
                                    </button>
                                </div>
                            </div>

                            {/* Specifications */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Specifications
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {product.specifications.split(',').map((spec, index) => {
                                        if (!spec.trim()) return null;
                                        const [key, ...valueParts] = spec.split(':');
                                        const value = valueParts.join(':').trim();
                                        return (
                                            <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
                                                <span className="text-gray-300 font-medium">{key?.trim()}</span>
                                                <span className="text-white font-semibold">{value}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Review */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI Review
                                </h3>
                                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                                    <p className="text-gray-200 leading-relaxed">{product.review}</p>
                                </div>
                            </div>

                            {/* Buy Buttons */}
                            <div className="pt-4">
                                <BuyButtons affiliateLink={product.affiliateLink} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Buy Now
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
                {preferredRegion === 'UK' && uk ? (
                    <>
                        <a href={uk} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-orange-500/30 border border-orange-400/20">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Buy on Amazon (UK)
                        </a>
                        <a href={us} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/30 border border-teal-400/20">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Buy on Amazon (US)
                        </a>
                    </>
                ) : (
                    <>
                        <a href={us} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-teal-500/30 border border-teal-400/20">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Buy on Amazon (US)
                        </a>
                        {uk && (
                            <a href={uk} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-orange-500/30 border border-orange-400/20">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                Buy on Amazon (UK)
                            </a>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
