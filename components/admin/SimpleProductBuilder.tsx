import React, { useState } from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface SimpleProductBuilderProps {
    onProductBuilt: (product: Partial<Product>) => void;
}

const SimpleProductBuilder: React.FC<SimpleProductBuilderProps> = ({ onProductBuilt }) => {
    const { addToast } = useApp();
    const [input, setInput] = useState('');
    const [isBuilding, setIsBuilding] = useState(false);
    const [builtProduct, setBuiltProduct] = useState<Partial<Product> | null>(null);

    const handleBuild = async () => {
        if (!input.trim()) {
            addToast('Enter a product URL or name', 'error');
            return;
        }

        setIsBuilding(true);
        try {
            const response = await fetch('/api/ai/build-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: input.trim() })
            });

            if (!response.ok) {
                throw new Error('Build failed');
            }

            const product = await response.json();
            setBuiltProduct(product);
            onProductBuilt(product);
            addToast('Product built successfully!', 'success');
        } catch (error) {
            addToast('Failed to build product', 'error');
        } finally {
            setIsBuilding(false);
        }
    };

    const handleEdit = (field: keyof Product, value: any) => {
        if (!builtProduct) return;
        setBuiltProduct({ ...builtProduct, [field]: value });
    };

    const handleSave = async () => {
        if (!builtProduct) return;
        
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(builtProduct)
            });

            if (response.ok) {
                addToast('Product saved!', 'success');
                setBuiltProduct(null);
                setInput('');
            } else {
                addToast('Failed to save product', 'error');
            }
        } catch (error) {
            addToast('Failed to save product', 'error');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-4">Build Product</h1>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste product URL or type product name (e.g., RTX 4070 Super)"
                        className="input-blueprint flex-1"
                    />
                    <button
                        onClick={handleBuild}
                        disabled={isBuilding || !input.trim()}
                        className="btn-blueprint btn-blueprint--primary"
                    >
                        {isBuilding ? 'Building...' : 'Build Product'}
                    </button>
                </div>
            </div>

            {builtProduct && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Edit Product</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                            <input
                                value={builtProduct.name || ''}
                                onChange={(e) => handleEdit('name', e.target.value)}
                                className="input-blueprint w-full"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Brand</label>
                            <input
                                value={builtProduct.brand || ''}
                                onChange={(e) => handleEdit('brand', e.target.value)}
                                className="input-blueprint w-full"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                            <input
                                value={builtProduct.category || ''}
                                onChange={(e) => handleEdit('category', e.target.value)}
                                className="input-blueprint w-full"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Price</label>
                            <input
                                value={builtProduct.price || ''}
                                onChange={(e) => handleEdit('price', e.target.value)}
                                className="input-blueprint w-full"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Review</label>
                        <textarea
                            value={builtProduct.review || ''}
                            onChange={(e) => handleEdit('review', e.target.value)}
                            className="input-blueprint w-full"
                            rows={4}
                        />
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Specifications</label>
                        <textarea
                            value={builtProduct.specifications || ''}
                            onChange={(e) => handleEdit('specifications', e.target.value)}
                            className="input-blueprint w-full"
                            rows={3}
                        />
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Images</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {(builtProduct.imageUrls || []).map((url, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={url}
                                        alt={`Product ${index + 1}`}
                                        className="w-full h-24 object-cover rounded border border-slate-600"
                                        onError={(e) => {
                                            e.currentTarget.src = '/placeholder.jpg';
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const newUrls = (builtProduct.imageUrls || []).filter((_, i) => i !== index);
                                            handleEdit('imageUrls', newUrls);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-4">
                        <button
                            onClick={() => setBuiltProduct(null)}
                            className="btn-blueprint"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-blueprint btn-blueprint--primary"
                        >
                            Save Product
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimpleProductBuilder;
