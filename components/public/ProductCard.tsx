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
        <div className="bg-slate-900/50 rounded-lg overflow-hidden transition-all duration-300 group hover:scale-[1.02] border border-slate-800 hover:border-sky-500/50">
            <div className="relative cursor-pointer" onClick={() => onCardClick(product)}>
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-32 object-contain bg-gray-900/40 p-2" 
                    onError={handleImageError} 
                    loading="lazy" 
                />
                {product.brand && (
                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-900/70 border border-slate-700 text-sky-300 uppercase tracking-wider font-semibold">{product.brand}</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider font-medium text-slate-400">{product.category}</span>
                    <span className="font-bold text-base text-sky-300">{product.price}</span>
                </div>
                <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">{product.name}</h3>
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                        <TrendBadge product={product} />
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (!isInComparison) onAddToComparison(product); }}
                        disabled={isInComparison}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                            isInComparison 
                                ? 'border-green-500/30 text-green-300 bg-green-500/10' 
                                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-sky-500'
                        }`}
                        title={isInComparison ? 'Added to Comparison' : 'Add to Compare'}
                    >
                        {isInComparison ? <CheckCircleIcon className="w-3.5 h-3.5"/> : <CompareIcon className="w-3.5 h-3.5" />}
                        {isInComparison ? 'ADDED' : 'COMPARE'}
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