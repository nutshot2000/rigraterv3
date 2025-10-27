import React, { useEffect, useState } from 'react';
import { Product } from '../../types';
import { generateProductInfo, isAIEnabled } from '../../services/geminiService';
import { useApp } from '../../context/AppContext';
import Spinner from '../shared/Spinner';
import { SparklesIcon } from '../public/Icons';
import { AdminMode } from './AdminSidebar';

interface ProductWorkspaceProps {
    mode: AdminMode;
    currentProduct: Partial<Product> | null;
    setCurrentProduct: (product: Partial<Product> | null) => void;
}

const EditableField = ({ label, value, onChange, type = 'input' }: { label: string, value: string, onChange: (value: string) => void, type?: 'input' | 'textarea' }) => {
    const InputComponent = type === 'textarea' ? 'textarea' : 'input';
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="relative">
                <InputComponent
                    value={value}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                    className="input-blueprint w-full"
                    rows={type === 'textarea' ? 6 : undefined}
                />
                {value && (
                    <button onClick={() => onChange('')} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

const ProductWorkspace: React.FC<ProductWorkspaceProps> = ({ mode, currentProduct, setCurrentProduct }) => {
    const { addToast, addProduct, products, deleteProduct } = useApp();
    const [productUrl, setProductUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (mode === 'manual_product' && !currentProduct) {
            setCurrentProduct({ name: '', category: '', imageUrls: [] });
        }
    }, [mode]);

    const handleGenerate = async () => {
        if (!productUrl) {
            addToast('Please enter a product URL.', 'error');
            return;
        }
        if (!isAIEnabled) {
            addToast('AI features are disabled. Please set your API key.', 'error');
            return;
        }

        setIsGenerating(true);
        setCurrentProduct(null);
        try {
            const productInfo = await generateProductInfo(productUrl);
            setCurrentProduct(productInfo);
            addToast('Product information generated successfully!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Failed to generate product info from URL.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFieldChange = (field: keyof Product, value: string | string[]) => {
        if (currentProduct) {
            setCurrentProduct({ ...currentProduct, [field]: value as any });
        }
    };

    const handleSave = () => {
        if (!currentProduct || !currentProduct.name || !currentProduct.category) {
            addToast('Product name and category are required.', 'error');
            return;
        }

        const productToSave: Omit<Product, 'id'> = {
            name: currentProduct.name,
            category: currentProduct.category,
            price: currentProduct.price || '$0.00',
            imageUrl: (currentProduct.imageUrls && currentProduct.imageUrls[0]) || '',
            imageUrls: currentProduct.imageUrls || [],
            affiliateLink: currentProduct.affiliateLink || '#',
            review: currentProduct.review || '',
            specifications: currentProduct.specifications || '',
            brand: currentProduct.brand || '',
        };

        addProduct(productToSave);
        addToast('Product saved successfully!', 'success');
        setCurrentProduct(null);
        setProductUrl('');
    };

    const renderEditableForm = () => {
        if (!currentProduct) return null;
        return (
            <div className="mt-8 space-y-6 animate-fade-in">
                <EditableField label="Product Name" value={currentProduct.name || ''} onChange={(val) => handleFieldChange('name', val)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EditableField label="Category" value={currentProduct.category || ''} onChange={(val) => handleFieldChange('category', val)} />
                    <EditableField label="Brand" value={currentProduct.brand || ''} onChange={(val) => handleFieldChange('brand', val)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Image URLs (one per line)</label>
                    <textarea
                        value={(currentProduct.imageUrls || []).join('\n')}
                        onChange={(e) => handleFieldChange('imageUrls', e.target.value.split('\n'))}
                        className="input-blueprint min-h-[100px] w-full"
                        rows={4}
                    />
                </div>
                <EditableField label="AI Review" value={currentProduct.review || ''} onChange={(val) => handleFieldChange('review', val)} type="textarea" />
                <EditableField label="Specifications" value={currentProduct.specifications || ''} onChange={(val) => handleFieldChange('specifications', val)} type="textarea" />
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-700">
                    <button onClick={() => setCurrentProduct(null)} className="btn-blueprint">Cancel</button>
                    <button onClick={handleSave} className="btn-blueprint btn-blueprint--primary">Save Product</button>
                </div>
            </div>
        );
    };

    const renderManageProducts = () => {
        return (
            <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Manage Products</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Product Name</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{product.name}</th>
                                    <td className="px-6 py-4">{product.category}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setCurrentProduct(product)} className="font-medium text-teal-400 hover:underline mr-4">Edit</button>
                                        <button onClick={() => { if (window.confirm('Delete this product?')) { deleteProduct(product.id); addToast('Product deleted.', 'success'); } }} className="font-medium text-red-500 hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {currentProduct && (
                    <div className="mt-8 pt-6 border-t border-slate-700">
                        {renderEditableForm()}
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (mode) {
            case 'ai_url':
                return (
                    <div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                            <h2 className="text-xl font-bold text-white mb-4">New Product from URL (AI)</h2>
                            <div className="flex items-center gap-4">
                                <input
                                    type="url"
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    placeholder="https://www.amazon.com/dp/B0..."
                                    className="input-blueprint flex-grow"
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !isAIEnabled}
                                    className="btn-blueprint btn-blueprint--primary flex items-center gap-2"
                                >
                                    {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                                    <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
                                </button>
                            </div>
                        </div>
                        {isGenerating && (
                            <div className="text-center p-8">
                                <Spinner />
                                <p className="mt-4 text-slate-400">AI is analyzing the page... this can take a moment.</p>
                            </div>
                        )}
                        {renderEditableForm()}
                    </div>
                );
            case 'manual_product':
                return (
                    <div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                            <h2 className="text-xl font-bold text-white mb-4">Manual Product Entry</h2>
                            <p className="text-slate-400">Fill in the details for the new product below.</p>
                        </div>
                        {renderEditableForm()}
                    </div>
                );
            case 'manage_products':
                return renderManageProducts();
            default:
                return <p>Select an option from the sidebar.</p>;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Content Workbench</h1>
            <p className="text-slate-400 mb-8">Generate, edit, and manage your product listings.</p>
            {renderContent()}
        </div>
    );
};

export default ProductWorkspace;
