import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import ProductCard from '../components/public/ProductCard';
import FiltersToolbar from '../components/public/FiltersToolbar';
import ComparisonBar from '../components/public/ComparisonBar';
import { useNavigate } from 'react-router-dom';

// Brand chip filter replaced by dropdown multi-select (see BrandMultiSelect)

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
    // redesigned toolbar replaces collapsible filters
    const [page, setPage] = useState(1);
    const [hasUserScrolled, setHasUserScrolled] = useState(false);
    const enableAutoLoad = false; // disable infinite auto-advance
    const pageSize = 20; // 5 rows × 4 columns on xl screens

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
    }, [products, searchTerm, selectedCategory, selectedBrands, priceMin, priceMax, sortBy, specFilters]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
    const currentPageProducts = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredProducts.slice(start, start + pageSize);
    }, [filteredProducts, page]);

    // Scroll to top when paginating
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, [page]);

    // Mark when the user has actually scrolled, to avoid auto-advancing pages
    useEffect(() => {
        const onScroll = () => {
            if (window.scrollY > 100) setHasUserScrolled(true);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Infinite scroll: advance page when bottom sentinel is visible (only after user scrolls)
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        if (!enableAutoLoad) return;
        const entry = entries[0];
        if (entry.isIntersecting && hasUserScrolled) {
            setPage(p => (p < totalPages ? p + 1 : p));
        }
    }, [totalPages, hasUserScrolled, enableAutoLoad]);
    useEffect(() => {
        if (!enableAutoLoad) return;
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(onIntersect, { rootMargin: '200px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, [onIntersect, enableAutoLoad]);

    const handleCardClick = (product: Product) => {
        if (product.slug) navigate(`/products/${product.slug}`);
    };

    return (
        <>
        <Helmet>
            <title>RIGRATER | PC Hardware Ratings, Deals & AI-Powered Builds</title>
            <meta
                name="description"
                content="Discover PC hardware deals and compare GPUs, CPUs, RAM and storage. RIGRATER helps you rate, compare and upgrade your rig faster with AI-powered tools."
            />
            <link rel="canonical" href="https://www.rigrater.tech/" />
            <meta property="og:title" content="RIGRATER | PC Hardware Ratings, Deals & AI-Powered Builds" />
            <meta
                property="og:description"
                content="Hand-picked PC parts, live deals and AI-powered tools to help you build and upgrade gaming rigs with confidence."
            />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://www.rigrater.tech/" />
            <meta property="og:image" content="https://www.rigrater.tech/og/rigrater-home.png" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="RIGRATER | PC Hardware Ratings, Deals & AI-Powered Builds" />
            <meta
                name="twitter:description"
                content="Hand-picked PC parts, live deals and AI-powered tools to help you build and upgrade gaming rigs with confidence."
            />
        </Helmet>

        <div className="animate-fade-in">
            <header className="mb-10 text-center relative p-8 crt-frame">
                <div className="hero-beam" />
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs uppercase tracking-wider font-semibold">Rigrater • PC Parts, Rated</div>
                <h1 className="mt-4 text-5xl md:text-7xl text-white leading-tight font-bold">
                    Your Path to PC Domination: <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-sky-400">Start, Rate, </span><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400">Dominate.</span>
                </h1>
                <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto">
                    Compare GPUs, CPUs, RAM, and storage. Instant reviews, specs, and trends—so you can <span className="text-sky-300 font-semibold">rate, compare, and upgrade</span> faster.
                </p>
            </header>

            {/* Redesigned Filters Toolbar */}
            <div className="mb-8">
                <FiltersToolbar
                    search={pendingSearch}
                    onSearchChange={(v) => { setPendingSearch(v); setPage(1); }}
                    categories={categories}
                    category={selectedCategory}
                    onCategoryChange={(v) => { setSelectedCategory(v); setPage(1); }}
                    sortBy={sortBy}
                    onSortChange={(v) => { setSortBy(v); setPage(1); }}
                    priceMin={priceMin}
                    priceMax={priceMax}
                    onPriceChange={(min, max) => { setPriceMin(min); setPriceMax(max); setPage(1); }}
                    allBrands={Array.from(new Set(products.map(p => p.brand).filter(Boolean) as string[]))}
                    selectedBrands={selectedBrands}
                    onBrandsChange={(b) => { setSelectedBrands(b); setPage(1); }}
                    onReset={() => {
                        setSearchTerm('');
                        setPendingSearch('');
                        setSelectedCategory('All');
                        setSortBy('relevance');
                        setSelectedBrands([]);
                        setPriceMin('');
                        setPriceMax('');
                        setPage(1);
                    }}
                />
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
                    {/* sentinel removed while auto-load is disabled */}
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
                    onClick={() => setPage(1)}
                >
                    Start
                </button>
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
        </>
    );
};

export default HomePage;