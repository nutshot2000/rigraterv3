import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../../types';
import VirtualizedGrid from './VirtualizedGrid';
import ProductCard from './ProductCard';
import { ProductListParams, ProductListResponse } from '../../api/products/list';
import { useApp } from '../../context/AppContext';

interface ServerPaginatedGridProps {
  onProductClick: (product: Product) => void;
  initialParams?: Partial<ProductListParams>;
}

const ServerPaginatedGrid: React.FC<ServerPaginatedGridProps> = ({ 
  onProductClick,
  initialParams = {}
}) => {
  const { addToComparison, comparisonList, addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [brands, setBrands] = useState<string[]>([]);
  const [params, setParams] = useState<ProductListParams>({
    page: 1,
    pageSize: 12,
    sortBy: 'relevance',
    sortDirection: 'desc',
    search: '',
    category: 'All',
    brands: [],
    ...initialParams
  });

  const fetchProducts = useCallback(async (newParams?: Partial<ProductListParams>) => {
    try {
      setLoading(true);
      
      const queryParams = { 
        ...params,
        ...newParams,
      };
      
      const response = await fetch('/api/products/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryParams),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data: ProductListResponse = await response.json();
      
      if (queryParams.page === 1) {
        // First page, replace all products
        setProducts(data.products);
      } else {
        // Additional pages, append products
        setProducts(prev => [...prev, ...data.products]);
      }
      
      setTotalCount(data.totalCount);
      setHasMore(data.page < data.totalPages);
      
      // Update filter options if first page
      if (queryParams.page === 1) {
        if (data.categories?.length) setCategories(data.categories);
        if (data.brands?.length) setBrands(data.brands);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      addToast('Failed to load products', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [params, addToast]);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load more when reaching the end
  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts({ page: nextPage });
  }, [loading, hasMore, page, fetchProducts]);

  // Update filters
  const updateFilters = useCallback((newParams: Partial<ProductListParams>) => {
    setPage(1);
    setParams(prev => ({ ...prev, ...newParams, page: 1 }));
    fetchProducts({ ...newParams, page: 1 });
  }, [fetchProducts]);

  return (
    <div className="space-y-6">
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="text-sm text-slate-400 mb-4">
            Showing {products.length} of {totalCount} products
          </div>
          
          <VirtualizedGrid
            items={products}
            itemHeight={360}
            onEndReached={handleLoadMore}
            renderItem={(product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCardClick={onProductClick}
                onAddToComparison={addToComparison}
                isInComparison={comparisonList.some(p => p.id === product.id)}
              />
            )}
          />
          
          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-400 text-xl">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ServerPaginatedGrid;
