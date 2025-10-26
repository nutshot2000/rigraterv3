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
        const currentTarget = e.currentTarget;
        
        // First fallback: try a smaller image size for Amazon URLs
        if (currentTarget.src.includes('media-amazon') && currentTarget.src.includes('_SL')) {
            const smallerImg = currentTarget.src.replace(/_SL\d+_/i, '_SL500_');
            if (smallerImg !== currentTarget.src) {
                currentTarget.src = smallerImg;
                // If this also fails, the second onError will trigger the final fallback
                currentTarget.onerror = () => {
                    currentTarget.src = FALLBACK_IMAGE_URL;
                    currentTarget.onerror = null;
                };
                return;
            }
        }

        // Final fallback
        currentTarget.src = FALLBACK_IMAGE_URL;
        currentTarget.onerror = null; // Prevent infinite loops
    };

    const primaryImageUrl = (Array.isArray(product.imageUrls) && product.imageUrls.length > 0)
        ? product.imageUrls[0]
        : product.imageUrl; // Fallback to old field

    return (
        <div 
            className="bg-slate-900/60 rounded-lg overflow-hidden transition-all duration-300 group hover:scale-[1.02] border border-slate-800 hover:border-sky-500/50 shadow-lg hover:shadow-sky-500/10 cursor-pointer"
            onClick={() => onCardClick(product)}
        >
            <div className="relative">
                <div className="h-40 bg-slate-800/50 flex items-center justify-center p-2">
                    <img 
                        src={primaryImageUrl || FALLBACK_IMAGE_URL} 
                        alt={product.name} 
                        className="max-h-full max-w-full object-contain" 
                        onError={handleImageError} 
                        loading="lazy" 
                    />
                </div>
                {product.brand && (
                    <span className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-sky-300 uppercase tracking-wider font-semibold">{product.brand}</span>
                )}
            </div>
            <div className="p-3 bg-slate-900">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs uppercase tracking-wider font-medium text-slate-400">{product.category}</span>
                    <span className="font-bold text-lg text-sky-300">{product.price}</span>
                </div>
                <h3 className="text-base font-bold text-white line-clamp-2 leading-snug h-12">{product.name}</h3>
                <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!isInComparison) onAddToComparison(product); 
                    }}
                    disabled={isInComparison}
                    className={`w-full mt-3 inline-flex items-center justify-center gap-1.5 text-xs px-2.5 py-2 rounded-md border font-semibold tracking-wider transition-colors ${
                        isInComparison 
                            ? 'border-green-500/30 text-green-300 bg-green-500/10 cursor-not-allowed' 
                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-sky-500 hover:text-white'
                    }`}
                    title={isInComparison ? 'Added to Comparison' : 'Add to Compare'}
                >
                    {isInComparison ? <CheckCircleIcon className="w-4 h-4"/> : <CompareIcon className="w-4 h-4" />}
                    {isInComparison ? 'ADDED' : 'ADD TO COMPARE'}
                </button>
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