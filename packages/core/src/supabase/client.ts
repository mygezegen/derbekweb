import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<'public'>
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'createSupabaseClient requires both supabaseUrl and supabaseAnonKey.'
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, options);
}
