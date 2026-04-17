import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();

/**
 * Indica si el bundle tiene URL y clave anónima (necesario para auth, DB y Storage).
 * Si es false, el cliente usa placeholders y las peticiones fallan con "Failed to fetch".
 */
export const isSupabaseEnvConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackUrl = "https://placeholder.supabase.co";
const fallbackKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDI4OTY3OTksImV4cCI6MTk1ODQ2Njc5OX0.placeholder";

if (typeof window !== "undefined" && !isSupabaseEnvConfigured) {
  console.error(
    "[Supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (o PUBLISHABLE_KEY). Sin ellas, Storage y el resto de APIs devuelven «Failed to fetch»."
  );
}

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
