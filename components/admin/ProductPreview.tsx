import React from 'react';
import { Product } from '../../types';
import ProductCard from '../public/ProductCard';
import { FALLBACK_IMAGE_URL } from '../../constants';

interface ProductPreviewProps {
    product: Partial<Product> | null;
}

const ProductPreview: React.FC<ProductPreviewProps> = ({ product }) => {
    const previewProduct: Product = {
        id: product?.id || 'preview-id',
        name: product?.name || 'Product Name',
        category: product?.category || 'Category',
        price: product?.price || '$0.00',
        imageUrl: (product?.imageUrls && product.imageUrls[0]) || product?.imageUrl || FALLBACK_IMAGE_URL,
        imageUrls: product?.imageUrls || [FALLBACK_IMAGE_URL],
        affiliateLink: product?.affiliateLink || '#',
        review: product?.review || 'Awaiting AI review...',
        specifications: product?.specifications || 'Awaiting AI specs...',
        brand: product?.brand || 'Brand',
        slug: product?.slug || '',
        seoTitle: product?.seoTitle || '',
        seoDescription: product?.seoDescription || ''
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-4">Live Preview</h2>
            <div className="sticky top-24 space-y-6">
                <p className="text-sm text-slate-400">Storefront card</p>
                {product ? (
                     <ProductCard 
                        product={previewProduct} 
                        onCardClick={() => {}} 
                        onAddToComparison={() => {}}
                        isInComparison={false}
                    />
                ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-slate-500">Waiting for product data...</p>
                    </div>
                )}

                <div className="pt-2">
                    <p className="text-sm text-slate-400 mb-2">SEO preview</p>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                        <div className="text-sky-300 text-sm font-semibold truncate">{previewProduct.seoTitle || previewProduct.name}</div>
                        <div className="text-slate-400 text-xs mt-1 truncate">/{previewProduct.slug || 'your-product-slug'}</div>
                        <div className="text-slate-300 text-sm mt-2 line-clamp-3">{previewProduct.seoDescription || 'Meta description preview will appear here.'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductPreview;
