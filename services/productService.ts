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
        quickVerdict: row.quick_verdict ?? undefined,
        // Stored as newline-separated text in DB, exposed as string[] in app
        prosShort: row.pros_short
            ? String(row.pros_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        consShort: row.cons_short
            ? String(row.cons_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        isFeatured: row.is_featured ?? false,
    }));
    
    return {
        products,
        totalCount,
        page,
        pageSize,
        totalPages
    };
}

function normalizeCategoryLabel(input?: string, fallbackName?: string): string {
    const s = (input || '').toLowerCase() || (fallbackName || '').toLowerCase();
    const has = (re: RegExp) => re.test(s);
    if (has(/\bgpu|graphics|geforce|radeon|rtx|gtx\b/)) return 'GPU';
    if (has(/\bcpu\b|processor|ryzen|intel core|i\d-\d{4,}/)) return 'CPU';
    if (has(/\bmotherboard|b\d{3}|z\d{3}|x\d{3}\b/)) return 'Motherboard';
    if (has(/\bram\b|ddr\d|memory\b/)) return 'RAM';
    if (has(/\bssd|nvme|m\.2|hdd|storage\b/)) return 'Storage';
    if (has(/\bcase\b|pc case|tower/)) return 'Case';
    if (has(/\bkeyboard\b|keychron|mechanical/)) return 'Keyboard';
    if (has(/\bmouse\b|gaming mouse/)) return 'Mouse';
    if (has(/\bmonitor\b|display\b/)) return 'Monitor';
    if (has(/\bheadset\b|headphones\b/)) return 'Headset';
    if (has(/\bpsu\b|power\s*supply(\s*unit)?\b/)) return 'PSU';
    if (has(/\bcpu\s*cooler\b|heatsink|radiator\b|aio\b|liquid\s*cool/)) return 'CPU COOLER';
    return input || 'Misc';
}

export async function fetchDistinctCategories(): Promise<string[]> {
    if (!isBackendEnabled || !supabase) return [];
    const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
    if (error) return [];
    const set = new Set<string>();
    (data as any[]).forEach(r => {
        const c = (r.category || '').toString().trim();
        if (c) set.add(c);
    });
    return Array.from(set).sort();
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
        category: normalizeCategoryLabel(input.category, input.name),
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
        quick_verdict: (input as any).quickVerdict ?? null,
        pros_short: Array.isArray((input as any).prosShort)
            ? (input as any).prosShort.join('\n')
            : (input as any).prosShort ?? null,
        cons_short: Array.isArray((input as any).consShort)
            ? (input as any).consShort.join('\n')
            : (input as any).consShort ?? null,
        is_featured: (input as any).isFeatured ?? false,
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
        quickVerdict: row.quick_verdict ?? undefined,
        prosShort: row.pros_short
            ? String(row.pros_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        consShort: row.cons_short
            ? String(row.cons_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
    };
}

export async function updateProductById(id: string, input: Omit<Product, 'id'>): Promise<Product> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        name: input.name,
        category: normalizeCategoryLabel(input.category, input.name),
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
        quick_verdict: (input as any).quickVerdict ?? null,
        pros_short: Array.isArray((input as any).prosShort)
            ? (input as any).prosShort.join('\n')
            : (input as any).prosShort ?? null,
        cons_short: Array.isArray((input as any).consShort)
            ? (input as any).consShort.join('\n')
            : (input as any).consShort ?? null,
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
        quickVerdict: row.quick_verdict ?? undefined,
        prosShort: row.pros_short
            ? String(row.pros_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        consShort: row.cons_short
            ? String(row.cons_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        isFeatured: row.is_featured ?? false,
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
        quickVerdict: row.quick_verdict ?? undefined,
        prosShort: row.pros_short
            ? String(row.pros_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        consShort: row.cons_short
            ? String(row.cons_short).split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
    };
}

export async function fetchProductById(id: string): Promise<Product | null> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if ((error as any).code === 'PGRST116') return null;
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


