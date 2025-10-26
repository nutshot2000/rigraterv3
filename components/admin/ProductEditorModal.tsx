
import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateProductInfo, isAIEnabled, generateProductSEO, suggestRivals } from '../../services/geminiService';
import Spinner from '../shared/Spinner';
import { CloseIcon, SparklesIcon } from '../public/Icons';
import { FALLBACK_IMAGE_URL, AMAZON_TAG_US, AMAZON_TAG_UK } from '../../constants';

interface ProductEditorModalProps {
    product: Product | null;
    onClose: () => void;
}

const ProductEditorModal: React.FC<ProductEditorModalProps> = ({ product, onClose }) => {
    const { addProduct, updateProduct, addToast } = useApp();
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        name: '', category: '', price: '', imageUrl: '', imageUrls: [], affiliateLink: '', review: '', specifications: '', brand: '', slug: ''
    });
    const [userEditedSlug, setUserEditedSlug] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                ...product,
                imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
                brand: product.brand || '',
                slug: product.slug || ''
            });
            setUserEditedSlug(Boolean(product.slug));
        } else {
            setFormData({ name: '', category: '', price: '', imageUrl: '', imageUrls: [], affiliateLink: '', review: '', specifications: '', brand: '', slug: '' });
            setUserEditedSlug(false);
        }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const slugify = (value: string): string => {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    useEffect(() => {
        if (!userEditedSlug && formData.name) {
            setFormData(prev => ({ ...prev, slug: slugify(prev.name) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name]);
    
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null; // Prevent infinite loops
    };

    const handleGenerateContent = useCallback(async () => {
        if (!formData.name) {
            addToast("Please enter a product name first.", "error");
            return;
        }
        setIsGenerating(true);
        try {
            const aiData = await generateProductInfo(formData.name);
            setFormData(prev => ({ ...prev, ...aiData, brand: aiData.brand || prev.brand }));
            addToast('AI content generated successfully!', 'success');
        } catch (error) {
            addToast('Failed to generate content from AI.', 'error');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    }, [formData.name, addToast]);

    const canonicalizeAmazon = (url: string): string => {
        try {
            const u = new URL(url);
            if (!u.hostname.includes('amazon.')) return url;
            // Drop tracking params, keep our tag
            const keep = new Set(['tag', 'smid', 'm']);
            Array.from(u.searchParams.keys()).forEach(k => { if (!keep.has(k)) u.searchParams.delete(k); });
            return u.toString();
        } catch { return url; }
    };

    const applyTags = (url: string): string => {
        try {
            const u = new URL(url);
            if (!u.hostname.includes('amazon.')) return url;
            const isUK = u.hostname.includes('.co.uk');
            const tag = isUK ? AMAZON_TAG_UK : AMAZON_TAG_US;
            if (tag) u.searchParams.set('tag', tag);
            return u.toString();
        } catch { return url; }
    };

    const normalizeAmazonLink = (url: string): string => {
        try {
            const u = new URL(url);
            if (!u.hostname.includes('amazon.')) return url;
            // Canonicalize and apply tag
            const canonicalized = canonicalizeAmazon(url);
            const tagged = applyTags(canonicalized);
            return tagged;
        } catch (e) {
            console.error("Error normalizing Amazon link:", e);
            return url; // Return original if normalization fails
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure imageUrls is an array, handling string from textarea
        const finalImageUrls = Array.isArray(formData.imageUrls)
            ? formData.imageUrls.filter(url => url.trim() !== '')
            : (typeof formData.imageUrls === 'string' ? (formData.imageUrls as string).split('\n').filter(url => url.trim() !== '') : []);

        if (finalImageUrls.length === 0) {
            addToast('Please provide at least one image URL.', 'error');
            return;
        }

        const dataToSave = {
            ...formData,
            imageUrls: finalImageUrls,
            imageUrl: finalImageUrls[0], // Ensure legacy imageUrl is set to the primary image
            affiliateLink: normalizeAmazonLink(formData.affiliateLink),
        };

        const backendOn = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
        if (product) {
            updateProduct({ ...dataToSave, id: product.id });
            addToast('Product updated successfully!', 'success');
        } else {
            addProduct(dataToSave);
            addToast(backendOn ? 'Product added successfully!' : 'Saved locally (login to persist to DB)', backendOn ? 'success' : 'error');
        }
        onClose();
    };

    const renderInputField = (name: keyof Omit<Product, 'id' | 'review' | 'specifications'>, label: string, placeholder: string, type: string = "text") => (
         <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <input
                type={type}
                id={name}
                name={name}
                value={(formData as any)[name] || ''}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                required
            />
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-700 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {renderInputField('name', 'Product Name', 'e.g., NVIDIA GeForce RTX 4090')}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderInputField('brand' as any, 'Brand', 'e.g., NVIDIA')}
                            <div>
                                <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
                                <input
                                    type="text"
                                    id="slug"
                                    name="slug"
                                    value={(formData.slug as any) || ''}
                                    onChange={(e) => { setUserEditedSlug(true); handleChange(e); }}
                                    placeholder="e.g., nvidia-geforce-rtx-4090"
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-4">
                                {renderInputField('category', 'Category', 'e.g., GPU')}
                                <div>
                                    <label htmlFor="imageUrls" className="block text-sm font-medium text-gray-300 mb-1">Image URLs (one per line)</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <textarea
                                            name="imageUrls"
                                            value={Array.isArray(formData.imageUrls) ? formData.imageUrls.join('\n') : formData.imageUrls}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                            rows={3}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(f => ({ ...f, imageUrls: [] }))}
                                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white text-xs"
                                            title="Clear Image URLs"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                             <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-300">Image Preview</label>
                                {formData.imageUrl ? (
                                    <img 
                                        src={formData.imageUrl} 
                                        alt="Product preview" 
                                        className="w-full h-28 object-cover rounded-md bg-gray-900 border border-gray-600"
                                        onError={handleImageError}
                                    />
                                ) : (
                                    <div className="w-full h-28 flex items-center justify-center bg-gray-900 border border-gray-600 rounded-md text-gray-500 text-sm">
                                        Enter an image URL
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-md bg-gray-900/50 border border-dashed border-purple-500 space-y-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isAIEnabled) {
                                        addToast('AI key missing. Set GEMINI_API_KEY to enable generation.', 'error');
                                        return;
                                    }
                                    void handleGenerateContent();
                                }}
                                disabled={isGenerating || !formData.name || !isAIEnabled}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5"/>}
                               {isGenerating ? 'Generating...' : (isAIEnabled ? 'Generate Details & Image with AI' : 'AI Disabled')}
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderInputField('price', 'Price (AI)', '$XXXX.XX')}
                                <div>
                                    <label htmlFor="affiliateLink" className="block text-sm font-medium text-gray-300 mb-1">Affiliate Link (AI)</label>
                                    <input
                                        type="text"
                                        id="affiliateLink"
                                        name="affiliateLink"
                                        value={formData.affiliateLink}
                                        onChange={handleChange}
                                        placeholder="https://amazon.com/..."
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Tip: Paste any Amazon URL (US or UK). We canonicalize and append your tag on save.</p>
                                </div>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!formData.name || !formData.specifications) { addToast('Enter name and specs first.', 'error'); return; }
                                        try {
                                            const rivals = await suggestRivals(formData.name, formData.specifications, 2);
                                            if (!rivals.length) { addToast('No rivals suggested.', 'info'); return; }
                                            const summary = `Comparison: ${formData.name} vs ${rivals.join(' vs ')}`;
                                            addToast(`Rivals: ${rivals.join(', ')}`, 'success');
                                            // Prefill comparison via localStorage handoff
                                            localStorage.setItem('prefillComparisonTitle', summary);
                                            localStorage.setItem('prefillComparisonNames', JSON.stringify([formData.name, ...rivals]));
                                        } catch {
                                            addToast('Failed to suggest rivals.', 'error');
                                        }
                                    }}
                                    className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                                >
                                    Suggest Rivals (prefill comparison)
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">SEO Title</label>
                                    <input
                                        type="text"
                                        name="seoTitle"
                                        value={(formData as any).seoTitle || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        placeholder="Compelling page title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">SEO Description</label>
                                    <input
                                        type="text"
                                        name="seoDescription"
                                        value={(formData as any).seoDescription || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                        placeholder="Meta description"
                                    />
                                </div>
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const res = await generateProductSEO(formData.name, formData.category, formData.review);
                                            setFormData(prev => ({ ...prev, seoTitle: res.seoTitle, seoDescription: res.seoDescription } as any));
                                            addToast('SEO fields generated', 'success');
                                        } catch {
                                            addToast('Failed to generate SEO fields.', 'error');
                                        }
                                    }}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                                >
                                    Generate SEO Title & Description
                                </button>
                            </div>
                            <div>
                                <label htmlFor="specifications" className="block text-sm font-medium text-gray-300 mb-1">Specifications (AI)</label>
                                <textarea
                                    id="specifications"
                                    name="specifications"
                                    value={formData.specifications}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                    placeholder="AI-generated specifications will appear here... (e.g., Cores: 16, Clock Speed: 5.7GHz, ...)"
                                    required
                                ></textarea>
                            </div>
                            <div>
                                <label htmlFor="review" className="block text-sm font-medium text-gray-300 mb-1">Review (AI)</label>
                                <textarea
                                    id="review"
                                    name="review"
                                    value={formData.review}
                                    onChange={handleChange}
                                    rows={6}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                    placeholder="AI-generated review will appear here..."
                                    required
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-semibold transition">Cancel</button>
                            <button type="submit" className="py-2 px-4 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition">{product ? 'Save Changes' : 'Add Product'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProductEditorModal;
