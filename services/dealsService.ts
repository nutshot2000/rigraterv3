import { supabase, isBackendEnabled } from './supabaseClient';
import { Deal } from '../types';

function mapRowToDeal(row: any): Deal {
    return {
        id: String(row.id),
        title: row.title,
        url: row.url,
        description: row.description || undefined,
        merchant: row.merchant || undefined,
        priceLabel: row.price_label || undefined,
        tag: row.tag || undefined,
        imageUrl: row.image_url || undefined,
        createdAt: row.created_at,
    };
}

export async function fetchDeals(): Promise<Deal[]> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map(mapRowToDeal);
}

export async function createDeal(input: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        url: input.url,
        description: input.description ?? null,
        merchant: input.merchant ?? null,
        price_label: input.priceLabel ?? null,
        tag: input.tag ?? null,
        image_url: input.imageUrl ?? null,
    };
    const { data, error } = await supabase
        .from('deals')
        .insert(payload)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToDeal(data as any);
}

export async function updateDealById(id: string, input: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        url: input.url,
        description: input.description ?? null,
        merchant: input.merchant ?? null,
        price_label: input.priceLabel ?? null,
        tag: input.tag ?? null,
        image_url: input.imageUrl ?? null,
    };
    const { data, error } = await supabase
        .from('deals')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToDeal(data as any);
}

export async function deleteDealById(id: string): Promise<void> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);
    if (error) throw error;
}


