import { createClient, SupabaseClient } from '@supabase/supabase-js';

// VITE_ variables are exposed to the client-side
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

export const isBackendEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isBackendEnabled
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;


