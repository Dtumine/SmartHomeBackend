import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const upsertAdminPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para gestionar perfiles por admin).',
      });
      return;
    }

    const rawId = req.params['id'];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { nombre_completo }: { nombre_completo?: string } = req.body ?? {};

    if (!id || !id.trim()) {
      res.status(400).json({ status: 'error', message: 'ID de usuario inválido.' });
      return;
    }

    const nombre = nombre_completo?.trim() ?? '';
    if (!nombre) {
      res.status(400).json({
        status: 'error',
        message: 'nombre_completo es obligatorio.',
      });
      return;
    }

    // Verificar existencia en Auth antes de upsert de perfil
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(id.trim());
    if (authError || !authData?.user) {
      res.status(400).json({
        status: 'error',
        message: 'El usuario indicado no existe en Auth.',
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('perfiles')
      .upsert(
        {
          id: id.trim(),
          nombre_completo: nombre,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }

    res.json({ status: 'success', data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al actualizar perfil';
    res.status(500).json({ status: 'error', message });
  }
};

