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
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-4">Live Preview</h2>
            <div className="sticky top-24">
                <p className="text-sm text-slate-400 mb-4">This is how your product will appear on the storefront.</p>
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
            </div>
        </div>
    );
};

export default ProductPreview;
