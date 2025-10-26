import React from 'react';
import { Product } from '../../types';
import { EyeIcon, CompareIcon, CheckCircleIcon } from './Icons';
import { FALLBACK_IMAGE_URL } from '../../constants';

interface ProductCardProps {
    product: Product;
    onCardClick: (product: Product) => void;
    onAddToComparison: (product: Product) => void;
    isInComparison: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onCardClick, onAddToComparison, isInComparison }) => {
    
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null; // Prevent infinite loops
    };

    return (
        <div className="bg-gray-850/60 rounded-xl overflow-hidden border border-gray-700 hover:border-teal-500/40 transition shadow-sm hover:shadow-teal-500/20 group">
            <div className="relative cursor-pointer" onClick={() => onCardClick(product)}>
                <img src={product.imageUrl} alt={product.name} className="w-full h-44 object-cover bg-gray-900" onError={handleImageError} loading="lazy" />
                {product.brand && (
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-black/60 border border-white/10 text-white uppercase tracking-wider">{product.brand}</span>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-teal-300/90 uppercase tracking-wider">{product.category}</span>
                    <span className="text-teal-400 font-semibold">{product.price}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-white line-clamp-2 min-h-[40px]">{product.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <TrendBadge product={product} />
                        <span className="hidden sm:inline">View details</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (!isInComparison) onAddToComparison(product); }}
                        disabled={isInComparison}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-600 hover:border-teal-500 text-gray-300 hover:text-teal-300 disabled:text-green-400 disabled:border-green-600"
                        title={isInComparison ? 'Added to Comparison' : 'Add to Compare'}
                    >
                        {isInComparison ? <CheckCircleIcon className="w-4 h-4"/> : <CompareIcon className="w-4 h-4" />}
                        {isInComparison ? 'Added' : 'Compare'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;

const TrendBadge: React.FC<{ product: Product }> = ({ product }) => {
    const parsePrice = (p: string) => parseFloat(p.replace(/[^0-9.]/g, '')) || 0;
    const current = parsePrice(product.price);
    const points = product.priceHistory || [];
    if (!points.length) return null;
    const last30 = points.filter(pt => {
        const d = new Date(pt.date).getTime();
        return Date.now() - d <= 30 * 24 * 60 * 60 * 1000;
    });
    const avg = last30.length ? (last30.reduce((s, p) => s + p.price, 0) / last30.length) : (points.reduce((s, p) => s + p.price, 0) / points.length);
    if (!avg) return null;
    const diff = current - avg;
    const pct = Math.round((diff / avg) * 100);
    if (Math.abs(pct) < 3) return null;
    const good = pct < 0;
    const label = good ? `${Math.abs(pct)}% below 30d avg` : `${Math.abs(pct)}% above 30d avg`;
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${good ? 'border-green-400 text-green-300' : 'border-yellow-400 text-yellow-300'}`}>
            {label}
        </span>
    );
};