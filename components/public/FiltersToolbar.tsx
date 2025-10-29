import React from 'react';
import BrandMultiSelect from './BrandMultiSelect';

export type SortKey = 'relevance' | 'priceLow' | 'priceHigh' | 'nameAZ' | 'nameZA';

interface FiltersToolbarProps {
  // Search
  search: string;
  onSearchChange: (v: string) => void;
  
  // Category
  categories: string[];
  category: string;
  onCategoryChange: (v: string) => void;

  // Sort
  sortBy: SortKey;
  onSortChange: (v: SortKey) => void;

  // Price
  priceMin: string;
  priceMax: string;
  onPriceChange: (min: string, max: string) => void;

  // Brands
  allBrands: string[];
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;

  // Reset
  onReset: () => void;
}

const FiltersToolbar: React.FC<FiltersToolbarProps> = ({
  search,
  onSearchChange,
  categories,
  category,
  onCategoryChange,
  sortBy,
  onSortChange,
  priceMin,
  priceMax,
  onPriceChange,
  allBrands,
  selectedBrands,
  onBrandsChange,
  onReset,
}) => {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 md:p-5 space-y-4">
      {/* Row 1: Search + Category + Sort */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Find your next upgrade..."
              className="input-blueprint w-full"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
          >
            <option value="relevance">Relevance</option>
            <option value="priceLow">Price: Low to High</option>
            <option value="priceHigh">Price: High to Low</option>
            <option value="nameAZ">Name: A → Z</option>
            <option value="nameZA">Name: Z → A</option>
          </select>
        </div>
      </div>

      {/* Row 2: Price + Brands + Reset */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-x-6">
        <div className="md:col-span-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min $"
              value={priceMin}
              onChange={(e) => onPriceChange(e.target.value, priceMax)}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            />
            <input
              type="number"
              placeholder="Max $"
              value={priceMax}
              onChange={(e) => onPriceChange(priceMin, e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            />
          </div>
        </div>

        <div className="md:col-span-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">Brands</label>
          <BrandMultiSelect
            brands={allBrands}
            selected={selectedBrands}
            onChange={onBrandsChange}
            placeholder="Select brands"
          />
        </div>

        <div className="md:col-span-2 flex items-end">
          <button onClick={onReset} type="button" className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersToolbar;
