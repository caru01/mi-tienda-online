import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Guarda la sesión solo en memoria → se cierra al cerrar la pestaña
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
