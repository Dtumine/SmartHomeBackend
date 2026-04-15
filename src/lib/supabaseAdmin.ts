import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Las variables ya deben estar cargadas (ver import 'dotenv/config' al inicio de index.ts).
const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY no está definida: rutas API que tocan la BD y el panel admin no funcionarán hasta configurarla.'
  );
}

/** Cliente con rol de servicio solo para el servidor (nunca exponer la clave al navegador). */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
