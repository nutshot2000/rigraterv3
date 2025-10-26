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
        <div className="bg-gray-900/60 notch overflow-hidden transition-all duration-300 group hover:scale-[1.02] crt-frame" style={{borderColor: 'rgba(255,255,255,0.12)'}}>
            <div className="relative cursor-pointer" onClick={() => onCardClick(product)}>
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-32 object-contain bg-gray-900/40 p-2" 
                    onError={handleImageError} 
                    loading="lazy" 
                />
                {product.brand && (
                    <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded-full bg-black/70 border border-white/20 text-white uppercase tracking-wider font-medium neon-outline" style={{ color:'var(--accent)' }}>{product.brand}</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color:'color-mix(in oklab, var(--accent) 85%, white 10%)' }}>{product.category}</span>
                    <span className="font-bold text-sm" style={{ color:'var(--accent)' }}>{product.price}</span>
                </div>
                <h3 className="text-base text-white line-clamp-2 leading-snug crt-strong">{product.name}</h3>
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                        <TrendBadge product={product} />
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); if (!isInComparison) onAddToComparison(product); }}
                        disabled={isInComparison}
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${
                            isInComparison 
                                ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                                : 'border-white/10 text-gray-300 hover:bg-opacity-10'
                        } neon-outline`}
                        title={isInComparison ? 'Added to Comparison' : 'Add to Compare'}
                    >
                        {isInComparison ? <CheckCircleIcon className="w-3 h-3"/> : <CompareIcon className="w-3 h-3" />}
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