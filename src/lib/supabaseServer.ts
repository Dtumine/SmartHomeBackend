import type { Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Cliente Supabase con service role (bypass RLS).
 * Opción B: la seguridad queda en Express (`authenticate`) + filtros en controladores.
 * Auth (login / getUser JWT) sigue usando `../lib/supabase` (anon).
 */
export const supabaseServer = supabaseAdmin;

export function requireServerDb(res: Response): SupabaseClient | null {
  if (!supabaseAdmin) {
    res.status(503).json({
      status: 'error',
      message:
        'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para operaciones de base de datos).',
    });
    return null;
  }
  return supabaseAdmin;
}
