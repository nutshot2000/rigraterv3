import { supabase, isBackendEnabled } from './supabaseClient';
import { PromoButtonConfig } from '../types';

const TABLE = 'promo_button_config';
const SINGLE_ID = 1;

function mapRow(row: any): PromoButtonConfig {
  return {
    enabled: row.enabled ?? false,
    label: row.label || 'Deals',
    url: row.url || '/deals',
    size: (row.size as any) || 'md',
    color: (row.color as any) || 'amber',
    position: (row.position as any) || 'center',
    animation: (row.animation as any) || 'glow',
  };
}

export async function fetchPromoConfig(): Promise<PromoButtonConfig | null> {
  if (!isBackendEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', SINGLE_ID)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as any);
}

export async function savePromoConfig(input: PromoButtonConfig): Promise<PromoButtonConfig | null> {
  if (!isBackendEnabled || !supabase) return null;
  const payload = {
    id: SINGLE_ID,
    enabled: input.enabled ?? false,
    label: input.label || 'Deals',
    url: input.url || '/deals',
    size: input.size || 'md',
    color: input.color || 'amber',
    position: input.position || 'center',
    animation: input.animation || 'glow',
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error || !data) return null;
  return mapRow(data as any);
}


