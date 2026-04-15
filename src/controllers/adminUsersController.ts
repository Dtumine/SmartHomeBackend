import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para listar usuarios).',
      });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }

    const authUsers =
      data.users?.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      })) ?? [];

    const userIds = authUsers.map((u) => u.id);
    const profileNameById = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: perfiles, error: perfilesError } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombre_completo')
        .in('id', userIds);

      if (perfilesError) {
        res.status(400).json({ status: 'error', message: perfilesError.message });
        return;
      }

      for (const p of perfiles ?? []) {
        const id = typeof p.id === 'string' ? p.id : '';
        const nombre =
          typeof p.nombre_completo === 'string' ? p.nombre_completo.trim() : '';
        if (id) {
          profileNameById.set(id, nombre);
        }
      }
    }

    const users = authUsers.map((u) => ({
      ...u,
      nombre_completo: profileNameById.get(u.id) ?? null,
    }));

    res.json({ status: 'success', data: users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al listar usuarios';
    res.status(500).json({ status: 'error', message });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para crear usuarios).',
      });
      return;
    }

    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email y contraseña son obligatorios.',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        status: 'error',
        message: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }

    res.status(201).json({
      status: 'success',
      data: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear usuario';
    res.status(500).json({ status: 'error', message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para eliminar usuarios).',
      });
      return;
    }

    const rawId = req.params['id'];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id || typeof id !== 'string' || !id.trim()) {
      res.status(400).json({ status: 'error', message: 'ID de usuario inválido.' });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id.trim());

    if (error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }

    res.json({ status: 'success', message: 'Usuario eliminado.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al eliminar usuario';
    res.status(500).json({ status: 'error', message });
  }
};
