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
        <div 
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-teal-500/20 border border-gray-700 transition-all duration-300 group"
            style={{ perspective: '1000px' }}
        >
            <div 
                className="relative cursor-pointer transition-transform duration-300 group-hover:[transform:rotateY(10deg)_rotateX(5deg)_scale(1.05)]"
                onClick={() => onCardClick(product)}
            >
                <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-48 object-cover"
                    onError={handleImageError}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <EyeIcon className="w-12 h-12 text-white/80" />
                </div>
            </div>
            <div className="p-4">
                <p className="text-sm text-teal-400 uppercase tracking-wider">{product.category}</p>
                <h3 className="text-lg font-bold text-white mt-1 h-14">{product.name}</h3>
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-teal-400">{product.price}</p>
                        <TrendBadge product={product} />
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isInComparison) {
                                onAddToComparison(product);
                            }
                        }}
                        disabled={isInComparison}
                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-teal-400 transition-colors disabled:text-green-400 disabled:cursor-not-allowed"
                        title={isInComparison ? "Added to Comparison" : "Add to Compare"}
                    >
                       {isInComparison ? <CheckCircleIcon className="w-6 h-6"/> : <CompareIcon className="w-6 h-6" />}
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