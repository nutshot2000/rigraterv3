
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="grid md:grid-cols-2">
                    <div className="p-4">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-auto object-cover rounded-lg"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    </div>
                    <div className="p-6 flex flex-col">
                        <div>
                            <p className="text-sm text-teal-400 uppercase tracking-wider">{product.category}</p>
                            <h2 className="text-3xl font-bold text-white mt-1">{product.name}</h2>
                            <p className="text-3xl font-bold text-teal-400 mt-4">{product.price}</p>
                        </div>
                        <div className="mt-2">
                            <button
                                className="text-xs text-gray-400 hover:text-gray-200 underline"
                                onClick={() => {
                                    const params = new URLSearchParams(window.location.search);
                                    params.set('q', product.name);
                                    window.history.replaceState(null, '', `?${params.toString()}`);
                                }}
                            >
                                Copy sharable filter link
                            </button>
                        </div>
                        <div className="mt-6 text-gray-300 space-y-4 flex-grow">
                             <h4 className="font-semibold text-white text-lg">Key Specifications:</h4>
                             <ul className="list-disc list-inside space-y-1 text-sm">
                                 {product.specifications.split(',').map((spec, index) => (
                                     spec.trim() && <li key={index}>{spec.trim()}</li>
                                 ))}
                             </ul>

                             <h4 className="font-semibold text-white text-lg pt-4">AI Generated Review:</h4>
                             <p className="leading-relaxed">{product.review}</p>
                        </div>
                        <BuyButtons affiliateLink={product.affiliateLink} />
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
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {preferredRegion === 'UK' && uk ? (
                <>
                    <a href={uk} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg">
                        Buy on Amazon (UK)
                    </a>
                    <a href={us} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/30">
                        Buy on Amazon (US)
                    </a>
                </>
            ) : (
                <>
                    <a href={us} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-500/30">
                        Buy on Amazon (US)
                    </a>
                    {uk && (
                        <a href={uk} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg">
                            Buy on Amazon (UK)
                        </a>
                    )}
                </>
            )}
        </div>
    );
};
