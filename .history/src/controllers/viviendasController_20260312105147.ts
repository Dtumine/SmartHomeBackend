import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Vivienda } from '../interfaces/database.types';

export const getViviendas = async (req: Request, res: Response) => {
  try {
    const usuario_id = req.user?.id;
    const { data, error } = await supabase
      .from('viviendas')
      .select('*')
      .eq('usuario_id', usuario_id);

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getViviendaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('viviendas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Vivienda no encontrada' });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createVivienda = async (req: Request, res: Response) => {
  try {
    const usuario_id = req.user?.id;
    const nuevaVivienda: Partial<Vivienda> = { ...req.body, usuario_id };
    const { data, error } = await supabase
      .from('viviendas')
      .insert([nuevaVivienda])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
