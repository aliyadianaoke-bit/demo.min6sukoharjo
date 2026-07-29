import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://ipyougnmzbcgfxgzliso.supabase.co';
const defaultKey = 'sb_publishable_pJwmfr3-Ain1M2tgaI_ZPg_U8IYkRt4';

const env = (import.meta as any).env || {};
const procEnv = typeof process !== 'undefined' ? process.env || {} : {};

const supabaseUrl = 
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  procEnv.NEXT_PUBLIC_SUPABASE_URL ||
  defaultUrl;

const supabaseAnonKey = 
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_PUBLISHABLE_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
  procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co');
};

