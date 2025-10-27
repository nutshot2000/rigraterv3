import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import ProductDetailModal from '../components/public/ProductDetailModal';
import ComparisonBar from '../components/public/ComparisonBar';
import ServerPaginatedGrid from '../components/public/ServerPaginatedGrid';
import { ProductListParams } from '../api/products/list';
import { debounce } from 'lodash';

const EnhancedHomePage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterParams, setFilterParams] = useState<ProductListParams>({
    page: 1,
    pageSize: 12,
    sortBy: 'relevance',
    sortDirection: 'desc',
    search: '',
    category: 'All'
  });

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const cat = params.get('cat') || 'All';
    const sort = params.get('sort') || 'relevance';
    const dir = params.get('dir') as 'asc' | 'desc' || 'desc';
    
    setSearchTerm(q);
    setPendingSearch(q);
    setSelectedCategory(cat);
    setSortBy(sort);
    setSortDirection(dir);
    
    setFilterParams({
      page: 1,
      pageSize: 12,
      sortBy: sort,
      sortDirection: dir,
      search: q,
      category: cat === 'All' ? '' : cat
    });
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedCategory !== 'All') params.set('cat', selectedCategory);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (sortDirection !== 'desc') params.set('dir', sortDirection);
    
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [searchTerm, selectedCategory, sortBy, sortDirection]);

  // Debounced search
  const debouncedSearch = debounce((term: string) => {
    setSearchTerm(term);
    setFilterParams(prev => ({
      ...prev,
      page: 1,
      search: term
    }));
  }, 300);

  useEffect(() => {
    debouncedSearch(pendingSearch);
    return () => debouncedSearch.cancel();
  }, [pendingSearch]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setFilterParams(prev => ({
      ...prev,
      page: 1,
      category: category === 'All' ? '' : category
    }));
  };

  const handleSortChange = (sort: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    // Determine sort direction based on sort type
    if (sort === 'priceLow') {
      direction = 'asc';
    } else if (sort === 'priceHigh') {
      direction = 'desc';
    } else if (sort === 'nameAZ') {
      direction = 'asc';
    } else if (sort === 'nameZA') {
      direction = 'desc';
    }
    
    setSortBy(sort);
    setSortDirection(direction);
    setFilterParams(prev => ({
      ...prev,
      page: 1,
      sortBy: sort,
      sortDirection: direction
    }));
  };

  const handleBrandChange = (brands: string[]) => {
    setSelectedBrands(brands);
    setFilterParams(prev => ({
      ...prev,
      page: 1,
      brands
    }));
  };

  const handlePriceChange = (min: string, max: string) => {
    setPriceMin(min);
    setPriceMax(max);
    setFilterParams(prev => ({
      ...prev,
      page: 1,
      priceMin: min ? Number(min) : undefined,
      priceMax: max ? Number(max) : undefined
    }));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setPendingSearch('');
    setSelectedCategory('All');
    setSortBy('relevance');
    setSortDirection('desc');
    setSelectedBrands([]);
    setPriceMin('');
    setPriceMax('');
    setFilterParams({
      page: 1,
      pageSize: 12,
      sortBy: 'relevance',
      sortDirection: 'desc',
      search: '',
      category: ''
    });
  };

  const handleCardClick = (product: Product) => {
    setSelectedProduct(product);
  };
  
  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-10 text-center relative p-8 crt-frame">
        <div className="hero-beam" />
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs uppercase tracking-wider font-semibold">Rigrater • PC Parts, Rated by AI</div>
        <h1 className="mt-4 text-5xl md:text-7xl text-white leading-tight font-bold">
          BUILD SMARTER WITH <span className="text-sky-300">AI-RATED</span> PARTS!
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
              onChange={(e) => setPendingSearch(e.target.value)}
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
            {(selectedCategory !== 'All' || selectedBrands.length > 0 || priceMin || priceMax) && (
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
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                >
                  <option value="All">All Categories</option>
                  <option value="GPU">GPU</option>
                  <option value="CPU">CPU</option>
                  <option value="RAM">RAM</option>
                  <option value="Storage">Storage</option>
                  <option value="Motherboard">Motherboard</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Mouse">Mouse</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
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
                    onChange={(e) => handlePriceChange(e.target.value, priceMax)}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                  />
                  <input
                    type="number"
                    placeholder="Max $"
                    value={priceMax}
                    onChange={(e) => handlePriceChange(priceMin, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Product Grid */}
      <ServerPaginatedGrid 
        onProductClick={handleCardClick}
        initialParams={filterParams}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={handleCloseModal} />
      )}
      
      {/* Comparison Bar */}
      <ComparisonBar />
    </div>
  );
};

export default EnhancedHomePage;
