import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import ProductCard from '../components/public/ProductCard';
import ProductDetailModal from '../components/public/ProductDetailModal';
import ComparisonBar from '../components/public/ComparisonBar';
import VirtualizedGrid from '../components/public/VirtualizedGrid';

const BrandFilter: React.FC<{ brands: string[]; selected: string[]; onChange: (v: string[]) => void }> = ({ brands, selected, onChange }) => {
    const unique = Array.from(new Set(brands)).sort();
    return (
        <div className="flex flex-wrap gap-2">
            {unique.length === 0 ? (
                <span className="text-gray-500 text-sm">No brands</span>
            ) : unique.map(b => {
                const active = selected.includes(b);
                return (
                    <button
                        key={b}
                        className={`px-3 py-1 rounded-full border ${active ? 'border-teal-400 text-teal-300' : 'border-gray-600 text-gray-300'} hover:border-teal-500 hover:text-teal-300 transition text-sm`}
                        onClick={() => {
                            if (active) onChange(selected.filter(x => x !== b));
                            else onChange([...selected, b]);
                        }}
                    >
                        {b}
                    </button>
                );
            })}
        </div>
    );
};

const PresetBar: React.FC<{ presets: { name: string; data: any }[]; onSave: () => void; onApply: (preset: { name: string; data: any }) => void; onDelete: (name: string) => void }> = ({ presets, onSave, onApply, onDelete }) => {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                {presets.length === 0 ? (
                    <span className="text-xs text-gray-500">No presets saved</span>
                ) : (
                    presets.map(p => (
                        <button key={p.name} className="px-3 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-600" onClick={() => onApply(p)}>
                            {p.name}
                        </button>
                    ))
                )}
            </div>
            <div className="flex items-center gap-2">
                {presets.map(p => (
                    <button key={p.name + '-del'} className="text-xs text-red-400 hover:text-red-300" onClick={() => onDelete(p.name)}>Delete {p.name}</button>
                ))}
                <button className="px-3 py-1 rounded bg-teal-600 text-white text-xs hover:bg-teal-500" onClick={onSave}>Save Preset</button>
            </div>
        </div>
    );
};

const HomePage: React.FC = () => {
    const { products, addToComparison, comparisonList } = useApp();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState<'relevance' | 'priceLow' | 'priceHigh' | 'nameAZ' | 'nameZA'>('relevance');
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [priceMin, setPriceMin] = useState<string>('');
    const [priceMax, setPriceMax] = useState<string>('');
    const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({});
    const [presets, setPresets] = useState<{ name: string; data: any }[]>(() => {
        try { return JSON.parse(localStorage.getItem('filterPresets') || '[]'); } catch { return []; }
    });
    const [page, setPage] = useState(1);
    const pageSize = 12;

    // URL sync
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || '';
        const cat = params.get('cat') || 'All';
        const sort = (params.get('sort') as any) || 'relevance';
        const p = parseInt(params.get('page') || '1', 10) || 1;
        setSearchTerm(q);
        setSelectedCategory(cat);
        setSortBy(sort);
        setPage(Math.max(1, p));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (selectedCategory !== 'All') params.set('cat', selectedCategory);
        if (sortBy !== 'relevance') params.set('sort', sortBy);
        if (page > 1) params.set('page', String(page));
        const qs = params.toString();
        const url = qs ? `?${qs}` : window.location.pathname;
        window.history.replaceState(null, '', url);
    }, [searchTerm, selectedCategory, sortBy, page]);

    // Debounced search input
    const [pendingSearch, setPendingSearch] = useState('');
    useEffect(() => { setPendingSearch(searchTerm); }, []);
    useEffect(() => {
        const t = setTimeout(() => setSearchTerm(pendingSearch), 300);
        return () => clearTimeout(t);
    }, [pendingSearch]);

    const categories = useMemo(() => {
        const allCategories = products.map(p => p.category);
        return ['All', ...Array.from(new Set(allCategories))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const normalizePrice = (p: string) => parseFloat(p.replace(/[^0-9.]/g, '')) || 0;
        const base = products.filter(product => {
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBrand = selectedBrands.length === 0 || (product.brand && selectedBrands.includes(product.brand));
            const price = normalizePrice(product.price);
            const matchesPriceMin = priceMin ? price >= (parseFloat(priceMin) || 0) : true;
            const matchesPriceMax = priceMax ? price <= (parseFloat(priceMax) || Number.MAX_VALUE) : true;
            // Spec filters
            const specMap: Record<string, string> = {};
            product.specifications.split(',').forEach(s => {
                const [k, ...rest] = s.split(':');
                const key = (k || '').trim();
                const val = rest.join(':').trim();
                if (key) specMap[key] = val;
            });
            const matchesSpecs = Object.entries(specFilters).every(([key, values]) => {
                if (!values || values.length === 0) return true;
                const v = (specMap[key] || '').toLowerCase();
                return values.some(sel => v.includes(sel.toLowerCase()));
            });
            return matchesCategory && matchesSearch && matchesBrand && matchesPriceMin && matchesPriceMax && matchesSpecs;
        });
        const sorted = [...base].sort((a, b) => {
            switch (sortBy) {
                case 'priceLow':
                    return normalizePrice(a.price) - normalizePrice(b.price);
                case 'priceHigh':
                    return normalizePrice(b.price) - normalizePrice(a.price);
                case 'nameAZ':
                    return a.name.localeCompare(b.name);
                case 'nameZA':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });
        return sorted;
    }, [products, searchTerm, selectedCategory, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    const currentPageProducts = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredProducts.slice(start, start + pageSize);
    }, [filteredProducts, page]);

    // Infinite scroll: advance page when bottom sentinel is visible
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
            setPage(p => (p < totalPages ? p + 1 : p));
        }
    }, [totalPages]);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(onIntersect, { rootMargin: '200px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [onIntersect]);

    const handleCardClick = (product: Product) => {
        setSelectedProduct(product);
    };
    
    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    return (
        <div className="animate-fade-in">
            <header className="mb-8 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                    Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Next Upgrade</span>
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    AI-curated reviews and specs for the latest and greatest PC components on the market.
                </p>
            </header>

            <div className="mb-8 p-4 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700 flex flex-col gap-4 sticky top-20 z-40">
                <input
                    type="text"
                    placeholder="Search for a product..."
                    value={pendingSearch}
                    onChange={(e) => { setPendingSearch(e.target.value); setPage(1); }}
                    className="w-full sm:flex-grow px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
                    <select
                        value={selectedCategory}
                        onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    <select
					value={sortBy}
					onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
					className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition appearance-none"
					style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
				>
					<option value="relevance">Sort: Relevance</option>
					<option value="priceLow">Price: Low to High</option>
					<option value="priceHigh">Price: High to Low</option>
					<option value="nameAZ">Name: A → Z</option>
					<option value="nameZA">Name: Z → A</option>
				</select>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Min $"
                            value={priceMin}
                            onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                        />
                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Max $"
                            value={priceMax}
                            onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                        />
                    </div>
                    <BrandFilter brands={products.map(p => p.brand).filter(Boolean) as string[]} selected={selectedBrands} onChange={(b) => { setSelectedBrands(b); setPage(1); }} />
                </div>
            </div>
            
            {filteredProducts.length > 0 ? (
                <>
                    <PresetBar
                        onSave={() => {
                            const name = prompt('Preset name?');
                            if (!name) return;
                            const data = { searchTerm, selectedCategory, sortBy, selectedBrands, priceMin, priceMax, specFilters };
                            const next = [...presets.filter(p => p.name !== name), { name, data }];
                            setPresets(next);
                            localStorage.setItem('filterPresets', JSON.stringify(next));
                        }}
                        presets={presets}
                        onApply={(p) => {
                            setSearchTerm(p.data.searchTerm || '');
                            setPendingSearch(p.data.searchTerm || '');
                            setSelectedCategory(p.data.selectedCategory || 'All');
                            setSortBy(p.data.sortBy || 'relevance');
                            setSelectedBrands(p.data.selectedBrands || []);
                            setPriceMin(p.data.priceMin || '');
                            setPriceMax(p.data.priceMax || '');
                            setSpecFilters(p.data.specFilters || {});
                            setPage(1);
                        }}
                        onDelete={(name) => {
                            const next = presets.filter(p => p.name !== name);
                            setPresets(next);
                            localStorage.setItem('filterPresets', JSON.stringify(next));
                        }}
                    />
                    <VirtualizedGrid
                        items={currentPageProducts}
                        itemHeight={320}
                        onEndReached={() => setPage(p => (p < totalPages ? p + 1 : p))}
                        renderItem={(product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onCardClick={handleCardClick}
                                onAddToComparison={addToComparison}
                                isInComparison={comparisonList.some(p => p.id === (product as any).id)}
                            />
                        )}
                    />
                    <div ref={sentinelRef} className="h-8" />
                </>
            ) : (
                <div className="text-center py-16">
                    <p className="text-gray-400 text-xl">No products found matching your criteria.</p>
                </div>
            )}

            {/* Pagination controls remain for accessibility; infinite scroll will auto-advance */}
            {filteredProducts.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                        className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Prev
                    </button>
                    <span className="text-gray-300 text-sm">Page {page} of {totalPages}</span>
                    <button
                        className="px-3 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            )}

            {selectedProduct && (
                <ProductDetailModal product={selectedProduct} onClose={handleCloseModal} />
            )}
            
            <ComparisonBar />
        </div>
    );
};

export default HomePage;