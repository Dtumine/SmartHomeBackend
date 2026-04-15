import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Perfil } from '../interfaces/database.types';

export const getPerfil = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Perfil no encontrado' });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePerfil = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<Perfil> = req.body;
    const { data, error } = await supabase
      .from('perfiles')
      .update({ ...updates, actualizado_en: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
