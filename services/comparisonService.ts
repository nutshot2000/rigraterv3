import { supabase, isBackendEnabled } from './supabaseClient';
import { ComparisonDoc } from '../types';

export async function fetchComparisonDocs(): Promise<ComparisonDoc[]> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { data, error } = await supabase
        .from('comparison_docs')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map(mapRowToDoc);
}

export async function createComparisonDoc(input: Omit<ComparisonDoc, 'id' | 'createdAt'>): Promise<ComparisonDoc> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        product_ids: input.productIds,
        content: input.content,
        spec_diff_summary: input.specDiffSummary,
    };
    const { data, error } = await supabase
        .from('comparison_docs')
        .insert(payload)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToDoc(data as any);
}

export async function updateComparisonDocById(id: string, input: Omit<ComparisonDoc, 'id' | 'createdAt'>): Promise<ComparisonDoc> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const payload = {
        title: input.title,
        product_ids: input.productIds,
        content: input.content,
        spec_diff_summary: input.specDiffSummary,
    };
    const { data, error } = await supabase
        .from('comparison_docs')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
    if (error) throw error;
    return mapRowToDoc(data as any);
}

export async function deleteComparisonDocById(id: string): Promise<void> {
    if (!isBackendEnabled || !supabase) throw new Error('Backend disabled');
    const { error } = await supabase
        .from('comparison_docs')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

function mapRowToDoc(row: any): ComparisonDoc {
    return {
        id: String(row.id),
        title: row.title,
        productIds: Array.isArray(row.product_ids) ? row.product_ids : [],
        content: row.content || '',
        specDiffSummary: row.spec_diff_summary || '',
        createdAt: row.created_at,
    };
}


