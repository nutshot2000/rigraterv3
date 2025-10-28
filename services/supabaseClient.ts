import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vite exposes VITE_ prefixed variables to the client via import.meta.env
// and to server-side code via process.env
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isBackendEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isBackendEnabled
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;


