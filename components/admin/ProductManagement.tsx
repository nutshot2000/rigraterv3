import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../../types';
import { fetchProducts, deleteProductById, updateProductById, ProductQueryParams } from '../../services/productService';
import { useApp } from '../../context/AppContext';
import { TrashIcon, PencilIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FALLBACK_IMAGE_URL } from '../../constants';
import ProductEditModal from './ProductEditModal';
import { debounce } from 'lodash';

// Helper function to proxy image URLs
const getProxiedImageUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE_URL;
  if (url.startsWith('/api/proxy-image')) return url;
  if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  return url;
};

const ProductManagement: React.FC = () => {
  const { addToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [needsSeoOnly, setNeedsSeoOnly] = useState(false);

  const loadProducts = useCallback(async (params: ProductQueryParams = {}) => {
    setLoading(true);
    try {
      const response = await fetchProducts({
        page: params.page || currentPage,
        pageSize: params.pageSize || pageSize,
        sortBy: params.sortBy || sortField,
        sortDirection: params.sortDirection || sortDirection,
        search: params.search || searchTerm,
        category: params.category || categoryFilter
      });
      
      setProducts(response.products);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
      
      // Extract unique categories for filter dropdown
      if (!params.page) {
        const allCategories = new Set<string>();
        response.products.forEach(product => {
          if (product.category) allCategories.add(product.category);
        });
        setCategories(Array.from(allCategories).sort());
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortField, sortDirection, searchTerm, categoryFilter, addToast]);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle search with debounce
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setCurrentPage(1); // Reset to first page on new search
      loadProducts({ page: 1, search: term });
    }, 500),
    [loadProducts]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page on category change
    loadProducts({ page: 1, category });
  };

  const handleSort = (field: string) => {
    const newDirection = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    loadProducts({ sortBy: field, sortDirection: newDirection });
  };

  const handleSortPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    let field = 'created_at';
    let dir: 'asc' | 'desc' = 'desc';
    switch (preset) {
      case 'newest': field = 'created_at'; dir = 'desc'; break;
      case 'oldest': field = 'created_at'; dir = 'asc'; break;
      case 'nameAZ': field = 'name'; dir = 'asc'; break;
      case 'nameZA': field = 'name'; dir = 'desc'; break;
      case 'priceLow': field = 'price'; dir = 'asc'; break;
      case 'priceHigh': field = 'price'; dir = 'desc'; break;
      default: field = 'created_at'; dir = 'desc';
    }
    setSortField(field);
    setSortDirection(dir);
    setCurrentPage(1);
    loadProducts({ sortBy: field, sortDirection: dir, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProducts({ page });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page on page size change
    loadProducts({ page: 1, pageSize: newSize });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductById(id);
      setProducts(products.filter(p => p.id !== id));
      addToast('Product deleted successfully', 'success');
      setDeleteConfirmId(null);
      
      // Refresh the current page to ensure we have the right number of items
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      addToast('Failed to delete product', 'error');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...productData } = updatedProduct;
      await updateProductById(id, productData);
      
      // Update the local state
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
      setEditingProduct(null);
      addToast('Product updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update product:', error);
      addToast('Failed to update product', 'error');
    }
  };

  // Generate pagination controls
  const renderPagination = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-2 py-1 rounded ${currentPage === 1 ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700'}`}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
    );
    
    // First page
    if (startPage > 1) {
      pages.push(
        <button
          key="1"
          onClick={() => handlePageChange(1)}
          className="px-3 py-1 rounded text-slate-300 hover:bg-slate-700"
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="px-2 py-1 text-slate-500">...</span>);
      }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded ${i === currentPage ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
        >
          {i}
        </button>
      );
    }
    
    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="px-2 py-1 text-slate-500">...</span>);
      }
      
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 rounded text-slate-300 hover:bg-slate-700"
        >
          {totalPages}
        </button>
      );
    }
    
    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-2 py-1 rounded ${currentPage === totalPages ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700'}`}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    );
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-400">
          Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} products
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {pages}
          </div>
          
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="ml-4 bg-slate-800 border border-slate-700 rounded text-white text-sm px-2 py-1"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Manage Products</h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={handleCategoryChange}
              className="bg-slate-800 border border-slate-700 rounded-lg text-white px-3 py-2"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              onChange={handleSortPresetChange}
              defaultValue="newest"
              className="bg-slate-800 border border-slate-700 rounded-lg text-white px-3 py-2"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="nameAZ">Name A → Z</option>
              <option value="nameZA">Name Z → A</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
            </select>

            <label className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg text-white px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={needsSeoOnly}
                onChange={(e) => setNeedsSeoOnly(e.target.checked)}
              />
              <span className="text-sm">Needs SEO</span>
            </label>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('imageUrl')}
                    >
                      Image
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('category')}
                    >
                      Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('price')}
                    >
                      Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-800">
                  {(needsSeoOnly ? products.filter(p => !p.seoTitle || !p.seoDescription) : products).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        {searchTerm || categoryFilter ? 'No products match your search' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    (needsSeoOnly ? products.filter(p => !p.seoTitle || !p.seoDescription) : products).map((product) => (
                      <tr key={product.id} className="hover:bg-slate-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-12 w-12 bg-slate-800 rounded overflow-hidden flex items-center justify-center">
                            <img 
                              src={getProxiedImageUrl(product.imageUrl)} 
                              alt={product.name} 
                              className="h-full w-full object-contain"
                              loading="lazy" // Add lazy loading
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{product.name}</div>
                          {product.brand && (
                            <div className="text-xs text-slate-400">{product.brand}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-sky-400 font-semibold">
                          {product.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {deleteConfirmId === product.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-400 text-xs">Confirm delete?</span>
                              <button 
                                onClick={() => handleDelete(product.id)} 
                                className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded"
                              >
                                Yes
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)} 
                                className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setEditingProduct(product)} 
                                className="text-sky-500 hover:text-sky-400"
                                title="Edit product"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(product.id)} 
                                className="text-red-500 hover:text-red-400"
                                title="Delete product"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {renderPagination()}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleUpdateProduct}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductManagement;