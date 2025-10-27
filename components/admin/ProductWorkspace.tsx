import React, { useEffect, useState } from 'react';
import { Product } from '../../types';
import { generateProductInfo, isAIEnabled, generateProductSEO, suggestRivals } from '../../services/geminiService';
import { useApp } from '../../context/AppContext';
import Spinner from '../shared/Spinner';
import { SparklesIcon } from '../public/Icons';
import { AdminMode } from './AdminSidebar';

interface ProductWorkspaceProps {
    mode: AdminMode;
    currentProduct: Partial<Product> | null;
    setCurrentProduct: (product: Partial<Product> | null) => void;
}

const EditableField = ({ label, value, onChange, type = 'input', rightAdornment }: { label: string, value: string, onChange: (value: string) => void, type?: 'input' | 'textarea', rightAdornment?: React.ReactNode }) => {
    const InputComponent: any = type === 'textarea' ? 'textarea' : 'input';
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="relative">
                <InputComponent
                    value={value}
                    onChange={(e: any) => onChange((e.target as HTMLInputElement).value)}
                    className="input-blueprint w-full pr-10"
                    rows={type === 'textarea' ? 6 : undefined}
                />
                {rightAdornment}
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

const slugify = (s: string) => s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const ProductWorkspace: React.FC<ProductWorkspaceProps> = ({ mode, currentProduct, setCurrentProduct }) => {
    const { addToast, addProduct, products, deleteProduct } = useApp();
    const [productUrl, setProductUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [rivals, setRivals] = useState<string[]>([]);
    const [imageCandidates, setImageCandidates] = useState<string[]>([]);
    const [isExtractingImages, setIsExtractingImages] = useState(false);
    const [nameOnly, setNameOnly] = useState('');

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

    const handleAutoSlug = () => {
        if (!currentProduct) return;
        const base = `${currentProduct.brand ? currentProduct.brand + ' ' : ''}${currentProduct.name || ''}`;
        handleFieldChange('slug' as any, slugify(base));
    };

    const handleGenerateSEO = async () => {
        if (!currentProduct) return;
        try {
            if (!isAIEnabled) {
                // Fallback heuristics
                const title = `${currentProduct.name || 'Product'} | ${currentProduct.category || 'PC Parts'} Review & Specs`;
                const desc = `Explore ${currentProduct.name || 'this product'}: key specs, pricing, and our quick AI review. Compare and upgrade smarter.`;
                handleFieldChange('seoTitle' as any, title);
                handleFieldChange('seoDescription' as any, desc);
                addToast('SEO generated with defaults (AI disabled).', 'info');
                return;
            }
            const { seoTitle, seoDescription } = await generateProductSEO(
                currentProduct.name || '',
                currentProduct.category || '',
                currentProduct.review || ''
            );
            handleFieldChange('seoTitle' as any, seoTitle || '');
            handleFieldChange('seoDescription' as any, seoDescription || '');
            addToast('SEO generated.', 'success');
        } catch (e) {
            console.error(e);
            addToast('Failed to generate SEO.', 'error');
        }
    };

    const handleGenerateRivals = async () => {
        if (!currentProduct) return;
        try {
            const list = await suggestRivals(currentProduct.name || '', currentProduct.specifications || '', 3);
            setRivals(list);
        } catch (e) {
            console.error(e);
            addToast('Failed to suggest rivals.', 'error');
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
            slug: currentProduct.slug || slugify(`${currentProduct.brand ? currentProduct.brand + ' ' : ''}${currentProduct.name}`),
            seoTitle: currentProduct.seoTitle || '',
            seoDescription: currentProduct.seoDescription || '',
        };

        addProduct(productToSave);
        addToast('Product saved successfully!', 'success');
        setCurrentProduct(null);
        setProductUrl('');
        setRivals([]);
    };

    const validateCandidates = async (candidates: string[]) => {
        try {
            const resp = await fetch('/api/resolve-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: candidates }) });
            const data = await resp.json();
            const valid: string[] = Array.isArray(data.valid) ? data.valid : [];
            return valid;
        } catch {
            return candidates;
        }
    };

    const extractImages = async () => {
        if (!productUrl) return;
        setIsExtractingImages(true);
        try {
            const resp = await fetch('/api/extract-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productUrl }) });
            const data = await resp.json();
            const imgs: string[] = Array.isArray(data.images) ? data.images : [];
            const valid = await validateCandidates(imgs);
            setImageCandidates(valid);
            if (valid.length === 0) addToast('No valid images found on page.', 'error');
            // If we already have a product, optionally seed its imageUrls with the first few
            if (currentProduct && valid.length > 0 && (!currentProduct.imageUrls || currentProduct.imageUrls.length === 0)) {
                setCurrentProduct({ ...currentProduct, imageUrls: valid.slice(0, 3) });
            }
        } catch (e) {
            addToast('Failed to extract images.', 'error');
        } finally {
            setIsExtractingImages(false);
        }
    };

    const addImage = (url: string) => {
        if (!currentProduct) return;
        const list = currentProduct.imageUrls || [];
        if (!list.includes(url)) setCurrentProduct({ ...currentProduct, imageUrls: [...list, url] });
    };

    const aiCompleteFields = async () => {
        if (!currentProduct && !productUrl) return;
        try {
            const resp = await fetch('/api/ai/complete-product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productUrl, product: currentProduct }) });
            const data = await resp.json();
            if (resp.ok) {
                setCurrentProduct({ ...(currentProduct || {}), ...data });
                addToast('AI completed missing fields.', 'success');
            } else {
                addToast(data?.error || 'AI completion failed.', 'error');
            }
        } catch (e) {
            addToast('AI completion failed.', 'error');
        }
    };

    const buildFromName = async () => {
        if (!nameOnly.trim()) { addToast('Enter a product name.', 'error'); return; }
        try {
            const resp = await fetch('/api/ai/complete-product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: nameOnly }) });
            const data = await resp.json();
            if (resp.ok) {
                setCurrentProduct({ imageUrls: [], ...data });
                addToast('Generated from name.', 'success');
            } else {
                addToast(data?.error || 'Failed to generate from name.', 'error');
            }
        } catch {
            addToast('Failed to generate from name.', 'error');
        }
    };

    const renderEditableForm = () => {
        if (!currentProduct) return null;
        return (
            <div className="mt-8 space-y-4 animate-fade-in">

                <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-end gap-3">
                    <span className="text-sm text-slate-400 mr-auto">AI Tools</span>
                    <button onClick={aiCompleteFields} className="btn-blueprint btn-blueprint--primary text-sm">AI Complete Fields</button>
                    <button onClick={handleGenerateSEO} className="btn-blueprint text-sm">Generate SEO</button>
                    <button onClick={handleGenerateRivals} className="btn-blueprint text-sm">Suggest Rivals</button>
                </div>

                <details className="form-section" open>
                    <summary>Core Details</summary>
                    <div className="form-section-content">
                        <EditableField label="Product Name" value={currentProduct.name || ''} onChange={(val) => handleFieldChange('name', val)} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <EditableField label="Category" value={currentProduct.category || ''} onChange={(val) => handleFieldChange('category', val)} />
                            <EditableField label="Brand" value={currentProduct.brand || ''} onChange={(val) => handleFieldChange('brand', val)} />
                            <EditableField label="Price" value={currentProduct.price || ''} onChange={(val) => handleFieldChange('price' as any, val)} />
                            <EditableField label="Affiliate Link" value={currentProduct.affiliateLink || ''} onChange={(val) => handleFieldChange('affiliateLink' as any, val)} />
                        </div>
                    </div>
                </details>

                <details className="form-section">
                    <summary>Images</summary>
                    <div className="form-section-content">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">Image URLs (one per line)</label>
                            <button onClick={extractImages} className="btn-blueprint text-xs" disabled={isExtractingImages}> {isExtractingImages ? 'Scanning…' : 'Scan Page for Images'} </button>
                        </div>
                        <textarea
                            value={(currentProduct.imageUrls || []).join('\n')}
                            onChange={(e) => handleFieldChange('imageUrls', e.target.value.split('\n'))}
                            className="input-blueprint min-h-[100px] w-full"
                            rows={4}
                        />
                        {imageCandidates.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {imageCandidates.slice(0, 12).map((src) => (
                                    <button key={src} type="button" className="bg-slate-800/50 border border-slate-700 rounded p-2 hover:border-sky-500"
                                        title="Add to images" onClick={() => addImage(src)}>
                                        <img src={src} alt="candidate" className="w-full h-28 object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </details>

                <details className="form-section">
                    <summary>Content</summary>
                    <div className="form-section-content">
                        <EditableField label="AI Review" value={currentProduct.review || ''} onChange={(val) => handleFieldChange('review', val)} type="textarea" />
                        <EditableField label="Specifications" value={currentProduct.specifications || ''} onChange={(val) => handleFieldChange('specifications', val)} type="textarea" />
                    </div>
                </details>

                <details className="form-section">
                    <summary>SEO & Publishing</summary>
                    <div className="form-section-content">
                         <EditableField 
                            label="Slug"
                            value={currentProduct.slug || ''}
                            onChange={(val) => handleFieldChange('slug' as any, val)}
                            rightAdornment={
                                <button onClick={handleAutoSlug} className="absolute top-1/2 right-9 -translate-y-1/2 text-sky-300 text-xs">Auto</button>
                            }
                        />
                        <EditableField label="SEO Title" value={currentProduct.seoTitle || ''} onChange={(val) => handleFieldChange('seoTitle' as any, val)} />
                        <EditableField label="SEO Description" value={currentProduct.seoDescription || ''} onChange={(val) => handleFieldChange('seoDescription' as any, val)} type="textarea" />
                    </div>
                </details>

                <div className="flex justify-end gap-4 pt-4">
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
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                type="text"
                                value={nameOnly}
                                onChange={(e) => setNameOnly(e.target.value)}
                                placeholder="Or type a product name (e.g., RTX 4070 Super)"
                                className="input-blueprint md:col-span-2"
                            />
                            <button onClick={buildFromName} className="btn-blueprint">Build from Name</button>
                        </div>
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
