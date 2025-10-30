import { supabase, isBackendEnabled } from './supabaseClient';
import { Product } from '../types';

export interface ProductQueryParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    search?: string;
    category?: string;
}

export interface ProductsResponse {
    products: Product[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export async function fetchProducts(params?: ProductQueryParams): Promise<ProductsResponse> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    
    const {
        page = 1,
        pageSize = 20,
        sortBy = 'created_at',
        sortDirection = 'desc',
        search = '',
        category = ''
    } = params || {};

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Start building the query
    let query = supabase.from('products').select('*', { count: 'exact' });
    
    // Add filters if provided
    if (search) {
        query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,category.ilike.%${search}%`);
    }
    
    if (category) {
        query = query.eq('category', category);
    }
    
    // Add sorting
    const dbSortBy = sortBy === 'imageUrl' ? 'image_url' : 
                    sortBy === 'affiliateLink' ? 'affiliate_link' : 
                    sortBy || 'created_at';
    
    query = query.order(dbSortBy, { ascending: sortDirection === 'asc' });
    
    // Add pagination
    query = query.range(from, to);
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    const products = (data as any[]).map(row => ({
        id: String(row.id),
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageUrls: row.image_urls || [],
        price: row.price,
        affiliateLink: row.affiliate_link,
        review: row.review,
        specifications: row.specifications,
        brand: row.brand ?? undefined,
        slug: row.slug ?? undefined,
        seoTitle: row.seo_title ?? undefined,
        seoDescription: row.seo_description ?? undefined,
    }));
    
    return {
        products,
        totalCount,
        page,
        pageSize,
        totalPages
    };
}

function ensureSlug(name: string, slug?: string): string {
    if (slug && slug.trim()) return slug.trim();
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const slug = ensureSlug(input.name, input.slug);

    // Prevent duplicates: if a product with same slug exists, update it instead of inserting
    try {
        const existing = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
        if ((existing as any)?.data?.id) {
            return await updateProductById(String((existing as any).data.id), { ...input, slug });
        }
    } catch {}

    const payload = {
        name: input.name,
        category: input.category,
        image_url: input.imageUrl,
        image_urls: input.imageUrls || [],
        price: input.price,
        affiliate_link: input.affiliateLink,
        review: input.review,
        specifications: input.specifications,
        brand: input.brand ?? null,
        slug: slug ?? null,
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
    };
    const { data, error } = await supabase.from('products').insert(payload).select('*').single();
    if (error) throw error;
    const row = data as any;
    return {
        id: String(row.id),
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageUrls: row.image_urls || [],
        price: row.price,
        affiliateLink: row.affiliate_link,
        review: row.review,
        specifications: row.specifications,
        brand: row.brand ?? undefined,
        slug: row.slug ?? undefined,
        seoTitle: row.seo_title ?? undefined,
        seoDescription: row.seo_description ?? undefined,
    };
}

export async function updateProductById(id: string, input: Omit<Product, 'id'>): Promise<Product> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        name: input.name,
        category: input.category,
        image_url: input.imageUrl,
        image_urls: input.imageUrls || [],
        price: input.price,
        affiliate_link: input.affiliateLink,
        review: input.review,
        specifications: input.specifications,
        brand: input.brand ?? null,
        slug: input.slug ?? null,
        seo_title: input.seoTitle ?? null,
        seo_description: input.seoDescription ?? null,
    };
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    const row = data as any;
    return {
        id: String(row.id),
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageUrls: row.image_urls || [],
        price: row.price,
        affiliateLink: row.affiliate_link,
        review: row.review,
        specifications: row.specifications,
        brand: row.brand ?? undefined,
        slug: row.slug ?? undefined,
        seoTitle: row.seo_title ?? undefined,
        seoDescription: row.seo_description ?? undefined,
    };
}

export async function deleteProductById(id: string): Promise<void> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // PostgREST error for "not found"
        throw error;
    }
    if (!data) return null;

    const row = data as any;
    return {
        id: String(row.id),
        name: row.name,
        category: row.category,
        imageUrl: row.image_url,
        imageUrls: row.image_urls || [],
        price: row.price,
        affiliateLink: row.affiliate_link,
        review: row.review,
        specifications: row.specifications,
        brand: row.brand ?? undefined,
        slug: row.slug ?? undefined,
        seoTitle: row.seo_title ?? undefined,
        seoDescription: row.seo_description ?? undefined,
    };
}


