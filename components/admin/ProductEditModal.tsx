import React, { useState, useRef } from 'react';
import { Product } from '../../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FALLBACK_IMAGE_URL } from '../../constants';
import { supabase, isBackendEnabled } from '../../services/supabaseClient';
import { generateProductSEO } from '../../services/geminiService';

interface ProductEditModalProps {
  product: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

// Helper function to proxy image URLs
const getProxiedImageUrl = (url: string) => {
  if (!url) return FALLBACK_IMAGE_URL;
  if (url.startsWith('/api/proxy-image')) return url;
  if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  return url;
};

const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, onSave, onCancel }) => {
  const [editedProduct, setEditedProduct] = useState<Product>({ ...product });
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'seo'>('basic');
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (field: keyof Product, value: any) => {
    setEditedProduct({ ...editedProduct, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedProduct);
  };
  const handlePickFile = () => {
    if (!isBackendEnabled) {
      alert('Image upload requires Supabase backend to be enabled. Paste an image URL instead.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUploadImage: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!supabase) throw new Error('Backend not configured');

      const safeBase = (editedProduct.slug || editedProduct.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '.jpg';
      const path = `${safeBase}-${Date.now()}${ext}`;

      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');
      setEditedProduct(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (err: any) {
      alert(err?.message || 'Image upload failed. Ensure a bucket named "product-images" exists and public access is allowed.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clamp = (str: string, max: number) => str ? (str.length <= max ? str : str.slice(0, max - 1).trimEnd()) : '';

  const handleAutoSeo = async () => {
    if (!editedProduct.name) return;
    try {
      setIsGeneratingSeo(true);
      const { seoTitle, seoDescription } = await generateProductSEO(
        editedProduct.name,
        editedProduct.category || '',
        editedProduct.review || ''
      );
      setEditedProduct(prev => ({
        ...prev,
        seoTitle: clamp(seoTitle || prev.seoTitle || '', 60),
        seoDescription: clamp(seoDescription || prev.seoDescription || '', 155)
      }));
    } catch {
      // silent; user can still edit manually
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Edit Product</h2>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'basic' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'details' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('details')}
          >
            Details & Review
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${activeTab === 'seo' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('seo')}
          >
            SEO & Links
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-1/3">
                  <div className="bg-slate-900 rounded-lg p-4 flex flex-col items-center">
                    <img
                      src={getProxiedImageUrl(editedProduct.imageUrl)}
                      alt={editedProduct.name}
                      className="h-40 w-40 object-contain mb-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                      }}
                    />
                    <div className="w-full">
                      <label className="block text-sm font-medium text-slate-400 mb-1">Image URL</label>
                      <input
                        type="text"
                        value={editedProduct.imageUrl}
                        onChange={(e) => handleChange('imageUrl', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white text-sm"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handlePickFile}
                          className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-md"
                        >
                          Upload new image
                        </button>
                        {!isBackendEnabled && (
                          <span className="text-[10px] text-slate-500">Paste a direct URL when backend is off</span>
                        )}
                      </div>
                      <input ref={fileInputRef} onChange={handleUploadImage} type="file" accept="image/*" className="hidden" />
                    </div>
                  </div>
                </div>
                
                <div className="w-2/3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={editedProduct.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Brand</label>
                      <input
                        type="text"
                        value={editedProduct.brand || ''}
                        onChange={(e) => handleChange('brand', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                      <input
                        type="text"
                        value={editedProduct.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Price</label>
                    <input
                      type="text"
                      value={editedProduct.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Specifications</label>
                <textarea
                  value={editedProduct.specifications || ''}
                  onChange={(e) => handleChange('specifications', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white h-40"
                  placeholder="Key: Value, Key: Value, etc."
                />
                <p className="text-xs text-slate-500 mt-1">Format as "Key: Value, Key: Value" pairs</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Review</label>
                <textarea
                  value={editedProduct.review || ''}
                  onChange={(e) => handleChange('review', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white h-60"
                  placeholder="Product review content..."
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={editedProduct.slug || ''}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                  placeholder="product-url-slug"
                />
                <p className="text-xs text-slate-500 mt-1">Used in the URL: rigrater.com/products/[slug]</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={editedProduct.seoTitle || ''}
                  onChange={(e) => handleChange('seoTitle', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                  placeholder="SEO optimized title (60 chars max)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">SEO Description</label>
                <textarea
                  value={editedProduct.seoDescription || ''}
                  onChange={(e) => handleChange('seoDescription', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white h-20"
                  placeholder="SEO optimized description (160 chars max)"
                />
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Tip: Keep title ≤60 chars, description ≤155.</span>
                  <button
                    type="button"
                    onClick={handleAutoSeo}
                    disabled={isGeneratingSeo}
                    className="px-3 py-1 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-md"
                  >
                    {isGeneratingSeo ? 'Generating…' : 'Auto-generate'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Affiliate Link</label>
                <input
                  type="text"
                  value={editedProduct.affiliateLink || ''}
                  onChange={(e) => handleChange('affiliateLink', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white"
                  placeholder="https://amazon.com/dp/ASIN?tag=affiliate-tag"
                />
              </div>
            </div>
          )}
        </form>

        <div className="border-t border-slate-700 p-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
