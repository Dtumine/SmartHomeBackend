import { Request, Response } from 'express';
import { requireServerDb } from '../lib/supabaseServer';
import { Perfil } from '../interfaces/database.types';

export const getPerfil = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const id = req.user?.id;
    if (!id) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const { data, error } = await db
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single();

    // Si no existe perfil aún, devolver 404 (la app usa este caso para onboarding)
    if (error) {
      if (error.code == 'PGRST116') {
        return res.status(404).json({ message: 'Perfil no encontrado' });
      }
      throw error;
    }
    if (!data) return res.status(404).json({ message: 'Perfil no encontrado' });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePerfil = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const id = req.user?.id;
    if (!id) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const updates: Partial<Perfil> = req.body;
    // Upsert: si el perfil no existe aún, lo crea (id = auth.users.id)
    const payload: Partial<Perfil> & { id: string; actualizado_en: string } = {
      id,
      ...updates,
      actualizado_en: new Date().toISOString(),
    };

    const { data, error } = await db
      .from('perfiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
