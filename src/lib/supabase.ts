import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (import.meta.env && import.meta.env.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  'https://your-supabase-project.supabase.co';

const supabaseAnonKey = 
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (import.meta.env && import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-supabase-project.supabase.co' && supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';
};
