import { supabase, isBackendEnabled } from './supabaseClient';
import { Product } from '../types';

export async function fetchProducts(): Promise<Product[]> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map(row => ({
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
    }));
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        name: input.name,
        category: input.category,
        image_url: input.imageUrl,
        price: input.price,
        affiliate_link: input.affiliateLink,
        review: input.review,
        specifications: input.specifications,
        brand: input.brand ?? null,
        slug: input.slug ?? null,
    };
    const { data, error } = await supabase.from('products').insert(payload).select('*').single();
    if (error) throw error;
    const row = data as any;
    return {
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
    };
}

export async function updateProductById(id: string, input: Omit<Product, 'id'>): Promise<Product> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        name: input.name,
        category: input.category,
        image_url: input.imageUrl,
        price: input.price,
        affiliate_link: input.affiliateLink,
        review: input.review,
        specifications: input.specifications,
        brand: input.brand ?? null,
        slug: input.slug ?? null,
    };
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    const row = data as any;
    return {
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
    };
}

export async function deleteProductById(id: string): Promise<void> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
}


