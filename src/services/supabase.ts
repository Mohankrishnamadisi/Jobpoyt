import { createClient } from '@supabase/supabase-js';
import { trackedFetch } from './requestTracker';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Handle missing environment variables gracefully
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. The app may not function correctly.');
  // Provide default values to prevent initialization errors
  supabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
  supabaseAnonKey = supabaseAnonKey || 'placeholder-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: trackedFetch,
  },
});

const getVerificationRedirectUrl = () => `${window.location.origin}/#/auth/callback`;

// Auth functions
export const authService = {
  async signUp(email: string, password: string, userData: Record<string, unknown>, emailRedirectTo = getVerificationRedirectUrl()) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo,
      },
    });
    if (error) throw error;
    return data;
  },

  async resendVerificationEmail(email: string, emailRedirectTo = getVerificationRedirectUrl()) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle(loginMode: 'candidate' | 'recruiter' = 'candidate') {
    if (loginMode === 'recruiter') {
      throw new Error('Recruiter accounts cannot sign in with Google.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },

  async updateUserMetadata(metadata: Record<string, unknown>) {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });
    if (error) throw error;
    return data;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (session: unknown) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      callback(session);
    });
  },
};
