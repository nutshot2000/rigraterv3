import { supabase, isBackendEnabled } from './supabaseClient';

export async function loginWithEmailPassword(email: string, password: string): Promise<boolean> {
    if (!isBackendEnabled || !supabase) return false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return false;
    return Boolean(data.session);
}

export async function logoutSession(): Promise<void> {
    if (!isBackendEnabled || !supabase) return;
    await supabase.auth.signOut();
}

export function isAuthEnabled(): boolean {
    return isBackendEnabled;
}


