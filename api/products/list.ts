import { supabase, isBackendEnabled } from '../../services/supabaseClient';
import { Product } from '../../types';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  category?: string;
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
}

export interface ProductListResponse {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
  brands: string[];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get parameters from query or body
    const params: ProductListParams = req.method === 'GET' 
      ? req.query 
      : req.body || {};

    // Set defaults
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 12;
    const sortBy = params.sortBy || 'created_at';
    const sortDirection = params.sortDirection || 'desc';
    const search = params.search || '';
    const category = params.category || '';
    const brands = Array.isArray(params.brands) ? params.brands : [];
    const priceMin = Number(params.priceMin) || 0;
    const priceMax = Number(params.priceMax) || 0;

    if (!isBackendEnabled || !supabase) {
      // If backend is disabled, return mock data or error
      return res.status(200).json({
        products: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        categories: [],
        brands: []
      });
    }

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query
    let query = supabase.from('products').select('*', { count: 'exact' });

    // Add filters if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (brands.length > 0) {
      query = query.in('brand', brands);
    }

    if (priceMin > 0) {
      // This is a simplified approach - in reality, you'd need to normalize price strings
      query = query.gte('price_numeric', priceMin);
    }

    if (priceMax > 0) {
      query = query.lte('price_numeric', priceMax);
    }

    // Add sorting
    const dbSortBy = sortBy === 'priceLow' ? 'price_numeric' :
                    sortBy === 'priceHigh' ? 'price_numeric' :
                    sortBy === 'nameAZ' ? 'name' :
                    sortBy === 'nameZA' ? 'name' :
                    sortBy === 'imageUrl' ? 'image_url' : 
                    sortBy === 'affiliateLink' ? 'affiliate_link' : 
                    sortBy || 'created_at';
    
    const ascending = sortBy === 'priceLow' || sortBy === 'nameAZ' || 
                     (sortBy !== 'priceHigh' && sortBy !== 'nameZA' && sortDirection === 'asc');
    
    query = query.order(dbSortBy, { ascending });
    
    // Add pagination
    query = query.range(from, to);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Map database rows to Product type
    const products = (data as any[]).map(row => ({
      id: String(row.id),
      name: row.name,
      category: row.category,
      imageUrl: row.image_url,
      price: row.price,
      affiliateLink: row.affiliate_link,
      review: row.review,
      specifications: row.specifications,
      brand: row.brand ?? undefined,
      slug: row.slug ?? undefined,
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
      imageUrls: row.image_urls ?? [],
    }));

    // Get all categories and brands for filters
    const [categoriesResult, brandsResult] = await Promise.all([
      supabase.from('products').select('category').order('category'),
      supabase.from('products').select('brand').order('brand')
    ]);

    const categories = categoriesResult.data 
      ? ['All', ...new Set(categoriesResult.data.map(row => row.category).filter(Boolean))]
      : ['All'];
    
    const allBrands = brandsResult.data 
      ? [...new Set(brandsResult.data.map(row => row.brand).filter(Boolean))]
      : [];
    
    return res.status(200).json({
      products,
      totalCount,
      page,
      pageSize,
      totalPages,
      categories,
      brands: allBrands
    });
  } catch (error: any) {
    console.error('Error in products/list:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error?.message || String(error)
    });
  }
}

export const config = { runtime: 'nodejs' };
