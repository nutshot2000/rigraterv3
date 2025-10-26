import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, AISuggestedProduct } from '../../types';
import { suggestNewProducts, isAIEnabled } from '../../services/geminiService';
import ProductEditorModal from './ProductEditorModal';
import BlogEditorModal from './BlogEditorModal';
import ComparisonBuilderModal from './ComparisonBuilderModal';
import BulkAIGeneratorModal from './BulkAIGeneratorModal';
import Spinner from '../shared/Spinner';
import SkeletonCard from '../shared/SkeletonCard';
import { PlusIcon, SparklesIcon, TrashIcon, PencilIcon, LogoutIcon } from '../public/Icons';
import AIChatModal from './AIChatModal';
import CommandPalette, { CommandItem } from './CommandPalette';
import { FALLBACK_IMAGE_URL } from '../../constants';

const AdminDashboard: React.FC = () => {
    const { products, deleteProduct, logout, addToast, addProduct, updateProduct, preferredRegion, setPreferredRegion, audits } = useApp();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [suggestions, setSuggestions] = useState<AISuggestedProduct[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isBlogOpen, setIsBlogOpen] = useState(false);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isCmdOpen, setIsCmdOpen] = useState(false);

    // Handlers declared before usage to avoid TDZ runtime errors in production builds
    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsEditorOpen(true);
    };

    const handleAdd = () => {
        setSelectedProduct(null);
        setIsEditorOpen(true);
    };

    const handleDelete = (productId: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            deleteProduct(productId);
            addToast('Product deleted successfully.', 'success');
        }
    };

    const handleSuggestProducts = useCallback(async () => {
        setIsSuggesting(true);
        setSuggestions([]);
        try {
            // Pick an underrepresented category to broaden catalog coverage
            const allCats = Array.from(new Set(products.map(p => p.category)));
            const freq: Record<string, number> = {};
            allCats.forEach(c => { freq[c] = 0; });
            products.forEach(p => { freq[p.category] = (freq[p.category] || 0) + 1; });
            const sortedByScarcity = Object.entries(freq).sort((a,b) => a[1] - b[1]).map(([c]) => c);
            const candidate = sortedByScarcity[0] || 'GPU';
            const existingNames = products.map(p => p.name);
            const newSuggestions = await suggestNewProducts(candidate, 3, existingNames);
            setSuggestions(newSuggestions);
            addToast(`Generated suggestions for ${candidate} category.`, 'info');
        } catch (error) {
            addToast('Failed to get product suggestions from AI.', 'error');
            console.error(error);
        } finally {
            setIsSuggesting(false);
        }
    }, [addToast]);

    // Keyboard shortcut Ctrl+K / Cmd+K
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isK = e.key.toLowerCase() === 'k';
            if ((e.ctrlKey || e.metaKey) && isK) {
                e.preventDefault();
                setIsCmdOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const commands: CommandItem[] = [
        { id: 'add-product', title: 'Add New Product', shortcut: 'A', run: handleAdd },
        { id: 'ai-chat', title: 'Open AI Chat', shortcut: 'C', run: () => setIsChatOpen(true) },
        { id: 'new-blog', title: 'New Blog Post', run: () => setIsBlogOpen(true) },
        { id: 'new-comparison', title: 'New Comparison', run: () => setIsCompareOpen(true) },
        { id: 'bulk-products', title: 'Bulk AI Products', run: () => setIsBulkOpen(true) },
        { id: 'get-ideas', title: 'Get AI Product Ideas', run: () => { if (!isAIEnabled) { addToast('AI key missing.', 'error'); return; } void handleSuggestProducts(); } },
    ];
    
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.src = FALLBACK_IMAGE_URL;
        e.currentTarget.onerror = null; // Prevent infinite loops
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-gray-400">Manage products, blogs, and comparisons with AI assistance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-gray-300 text-sm">Region:</div>
                    <select aria-label="Preferred Region" value={preferredRegion} onChange={(e) => setPreferredRegion(e.target.value as any)} className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-200 text-sm">
                        <option value="US">US</option>
                        <option value="UK">UK</option>
                    </select>
                    <button data-testid="btn-ai-chat" onClick={() => setIsChatOpen(true)} className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">AI Chat</button>
                    <button data-testid="btn-logout" onClick={logout} className="flex items-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition">
                   <LogoutIcon className="w-5 h-5" /> Logout
                    </button>
                </div>
            </div>
            
             {/* AI Suggestions Section */}
            <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-purple-500/50 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-purple-400" />
                        AI Product Suggestions
                    </h2>
                    <button
                        onClick={() => {
                            if (!isAIEnabled) {
                                addToast('AI key missing. Set GEMINI_API_KEY to enable suggestions.', 'error');
                                return;
                            }
                            void handleSuggestProducts();
                        }}
                        disabled={isSuggesting || !isAIEnabled}
                        className="flex items-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition disabled:opacity-50"
                        data-testid="btn-get-ideas"
                    >
                         {isSuggesting ? <Spinner /> : (isAIEnabled ? 'Get New Ideas' : 'AI Disabled')}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isSuggesting && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                    {!isSuggesting && suggestions.map((suggestion, index) => (
                         <div key={index} className="bg-gray-900 p-3 rounded-lg flex items-start gap-3">
                            <img src={suggestion.imageUrl} alt={suggestion.name} className="w-20 h-20 object-cover rounded-md" onError={handleImageError} />
                            <div className="flex-1">
                                <p className="font-semibold text-white text-sm">{suggestion.name}</p>
                                <p className="text-xs text-gray-400">{suggestion.category}</p>
                            </div>
                            <div>
                                <button
                                    className="py-1 px-3 bg-teal-600 hover:bg-teal-500 rounded-md text-white text-xs font-semibold"
                                    onClick={() => {
                                        const template: Omit<Product, 'id'> = {
                                            name: suggestion.name,
                                            category: suggestion.category,
                                            imageUrl: suggestion.imageUrl,
                                            price: '$0.00',
                                            affiliateLink: '#',
                                            review: 'AI suggested product. Open editor to generate full details.',
                                            specifications: '',
                                        };
                                        addProduct(template);
                                        addToast('Product added from suggestion. Edit to enrich with AI.', 'success');
                                    }}
                                >
                                    Add to Store
                                </button>
                            </div>
                        </div>
                    ))}
                    {!isSuggesting && suggestions.length === 0 && (
                        <p className="text-gray-500 col-span-3 text-center py-4">Click "Get New Ideas" to see AI-powered suggestions.</p>
                    )}
                </div>
            </div>

            {/* Product Management Section */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Product Listings</h2>
                    <div className="flex gap-2">
                        <button data-testid="btn-add-product" onClick={handleAdd} className="flex items-center gap-2 py-2 px-4 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-semibold transition">
                           <PlusIcon className="w-5 h-5" /> Add New Product
                        </button>
                        <button data-testid="btn-new-blog" onClick={() => setIsBlogOpen(true)} className="py-2 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm">New Blog Post</button>
                        <button data-testid="btn-new-comparison" onClick={() => setIsCompareOpen(true)} className="py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm">New Comparison</button>
                        <button data-testid="btn-bulk-products" onClick={() => setIsBulkOpen(true)} className="py-2 px-4 bg-purple-700 hover:bg-purple-600 rounded-lg text-white text-sm">Bulk AI Products</button>
                        <button
                            onClick={() => {
                                // Snapshot current prices into priceHistory
                                let count = 0;
                                const nowIso = new Date().toISOString();
                                products.forEach(p => {
                                    const numeric = parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0;
                                    const history = p.priceHistory || [];
                                    const updated = { ...p, priceHistory: [...history, { date: nowIso, price: numeric }] };
                                    updateProduct(updated);
                                    count++;
                                });
                                addToast(`Snapshot saved for ${count} products.`, 'success');
                            }}
                            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm"
                            data-testid="btn-snapshot-prices"
                        >
                            Snapshot Prices
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="file"
                                accept="application/json"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                        const text = await file.text();
                                        const data = JSON.parse(text) as Array<Partial<Product>>;
                                        if (!Array.isArray(data)) throw new Error('Invalid JSON');
                                        let count = 0;
                                        data.forEach(item => {
                                            if (item && item.name && item.category) {
                                                const product: Omit<Product,'id'> = {
                                                    name: String(item.name),
                                                    category: String(item.category),
                                                    imageUrl: String(item.imageUrl || ''),
                                                    price: String(item.price || '$0.00'),
                                                    affiliateLink: String(item.affiliateLink || '#'),
                                                    review: String(item.review || ''),
                                                    specifications: String(item.specifications || ''),
                                                };
                                                addProduct(product);
                                                count++;
                                            }
                                        });
                                        addToast(`Imported ${count} products.`, 'success');
                                    } catch (err) {
                                        console.error(err);
                                        addToast('Failed to import JSON.', 'error');
                                    } finally {
                                        e.currentTarget.value = '';
                                    }
                                }}
                            />
                            <span className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">Import JSON</span>
                        </label>
                        <button
                            onClick={() => {
                                const exportData = products.map(({ id, ...rest }) => rest);
                                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `products-export-${Date.now()}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
                        >
                            Export JSON
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Product Name</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Price</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{product.name}</th>
                                    <td className="px-6 py-4">{product.category}</td>
                                    <td className="px-6 py-4">{product.price}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEdit(product)} className="font-medium text-teal-400 hover:underline mr-4"><PencilIcon className="w-5 h-5 inline" /></button>
                                        <button onClick={() => handleDelete(product.id)} className="font-medium text-red-500 hover:underline"><TrashIcon className="w-5 h-5 inline" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Log */}
            <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Target</th>
                                <th className="px-6 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audits.slice(0, 20).map(a => (
                                <tr key={a.id} className="bg-gray-800 border-b border-gray-700">
                                    <td className="px-6 py-3 text-gray-300">{new Date(a.ts).toLocaleString()}</td>
                                    <td className="px-6 py-3">{a.action}</td>
                                    <td className="px-6 py-3">{a.targetType}{a.targetId ? `:${a.targetId}` : ''}</td>
                                    <td className="px-6 py-3 text-xs text-gray-400">{a.details ? JSON.stringify(a.details) : '-'}</td>
                                </tr>
                            ))}
                            {audits.length === 0 && (
                                <tr><td className="px-6 py-4 text-gray-500" colSpan={4}>No recent activity.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditorOpen && (
                <ProductEditorModal 
                    product={selectedProduct} 
                    onClose={() => setIsEditorOpen(false)} 
                />
            )}
            {isChatOpen && (
                <AIChatModal onClose={() => setIsChatOpen(false)} />
            )}
            {isBlogOpen && (
                <BlogEditorModal onClose={() => setIsBlogOpen(false)} />
            )}
            {isCompareOpen && (
                <ComparisonBuilderModal onClose={() => setIsCompareOpen(false)} />
            )}
            {isBulkOpen && (
                <BulkAIGeneratorModal onClose={() => setIsBulkOpen(false)} />
            )}
            <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} commands={commands} />
        </div>
    );
};

export default AdminDashboard;
