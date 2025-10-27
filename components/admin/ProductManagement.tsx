import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { fetchProducts, deleteProductById, updateProductById } from '../../services/productService';
import { useApp } from '../../context/AppContext';
import { TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FALLBACK_IMAGE_URL } from '../../constants';
import ProductEditModal from './ProductEditModal';

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
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSort = (field: keyof Product) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductById(id);
      setProducts(products.filter(p => p.id !== id));
      addToast('Product deleted successfully', 'success');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      addToast('Failed to delete product', 'error');
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const { id, ...productData } = updatedProduct;
      await updateProductById(id, productData);
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
      setEditingProduct(null);
      addToast('Product updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update product:', error);
      addToast('Failed to update product', 'error');
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Manage Products</h1>
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white w-64 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {loading ? (
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
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        {searchTerm ? 'No products match your search' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-12 w-12 bg-slate-800 rounded overflow-hidden flex items-center justify-center">
                            <img 
                              src={getProxiedImageUrl(product.imageUrl)} 
                              alt={product.name} 
                              className="h-full w-full object-contain"
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
            
            <div className="mt-4 text-sm text-slate-400">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </div>
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
