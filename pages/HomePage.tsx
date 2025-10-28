import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import ProductCard from '../components/public/ProductCard';
import ComparisonBar from '../components/public/ComparisonBar';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
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
    const [showFilters, setShowFilters] = useState(false);
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
        if (product.slug) navigate(`/products/${product.slug}`);
    };

    return (
        <div className="animate-fade-in">
            <header className="mb-10 text-center relative p-8 crt-frame">
                <div className="hero-beam" />
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs uppercase tracking-wider font-semibold">Rigrater • PC Parts, Rated by AI</div>
                <h1 className="mt-4 text-5xl md:text-7xl text-white leading-tight font-bold">
                    Your Path to PC Domination: Start, Rate, Dominate.
                </h1>
                <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto">
                    Compare GPUs, CPUs, RAM, and storage. Instant AI reviews, specs, and trends—so you can <span className="text-sky-300 font-semibold">rate, compare, and upgrade</span> faster.
                </p>
            </header>

            {/* Search and Filter Panel */}
            <div className="mb-8">
                {/* Main Search Bar */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Find your next upgrade..."
                            value={pendingSearch}
                            onChange={(e) => { setPendingSearch(e.target.value); setPage(1); }}
                            className="input-blueprint"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn-blueprint flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                        </svg>
                        Filters
                        {Object.values({ selectedCategory, selectedBrands, priceMin, priceMax }).some(v => 
                            Array.isArray(v) ? v.length > 0 : v && v !== 'All' && v !== ''
                        ) && (
                            <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                        )}
                    </button>
                </div>

                {/* Collapsible Filter Panel */}
                {showFilters && (
                    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700 rounded-xl p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                                >
                                    {categories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                                >
                                    <option value="relevance">Relevance</option>
                                    <option value="priceLow">Price: Low to High</option>
                                    <option value="priceHigh">Price: High to Low</option>
                                    <option value="nameAZ">Name: A → Z</option>
                                    <option value="nameZA">Name: Z → A</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min $"
                                        value={priceMin}
                                        onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max $"
                                        value={priceMax}
                                        onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                                        className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Brands</label>
                                <BrandFilter brands={products.map(p => p.brand).filter(Boolean) as string[]} selected={selectedBrands} onChange={(b) => { setSelectedBrands(b); setPage(1); }} />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setPendingSearch('');
                                    setSelectedCategory('All');
                                    setSortBy('relevance');
                                    setSelectedBrands([]);
                                    setPriceMin('');
                                    setPriceMax('');
                                    setPage(1);
                                }}
                                className="px-4 py-2 text-gray-400 hover:text-white transition"
                            >
                                Clear all filters
                            </button>
                            <div className="text-sm text-gray-400">
                                {filteredProducts.length} products found
                            </div>
                        </div>
                    </div>
                )}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentPageProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onCardClick={handleCardClick}
                                onAddToComparison={addToComparison}
                                isInComparison={comparisonList.some(p => p.id === product.id)}
                            />
                        ))}
                    </div>
                    <div ref={sentinelRef} className="h-8" />
                </>
            ) : (
                <div className="text-center py-16">
                    <p className="text-gray-400 text-xl">No products found matching your criteria.</p>
                </div>
            )}
            
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

            <ComparisonBar />
        </div>
    );
};

export default HomePage;