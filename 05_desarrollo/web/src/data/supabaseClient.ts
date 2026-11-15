import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
