import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Dispositivo } from '../interfaces/database.types';

export const getDispositivos = async (req: Request, res: Response) => {
  try {
    const { vivienda_id } = req.query;
    const usuario_id = req.user?.id;

    // Primero obtener las viviendas del usuario para validar el acceso
    const { data: userViviendas } = await supabase
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map(v => v.id) || [];

    let query = supabase.from('dispositivos').select('*').in('vivienda_id', viviendaIds);

    if (vivienda_id) {
      if (!viviendaIds.includes(vivienda_id as string)) {
        return res.status(403).json({ message: 'No tienes acceso a esta vivienda' });
      }
      query = query.eq('vivienda_id', vivienda_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDispositivoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user?.id;

    // Obtener las viviendas del usuario
    const { data: userViviendas } = await supabase
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map(v => v.id) || [];

    const { data, error } = await supabase
      .from('dispositivos')
      .select('*')
      .eq('id', id)
      .in('vivienda_id', viviendaIds)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Dispositivo no encontrado' });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createDispositivo = async (req: Request, res: Response) => {
  try {
    const nuevoDispositivo: Partial<Dispositivo> = req.body;
    const { data, error } = await supabase
      .from('dispositivos')
      .insert([nuevoDispositivo])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDispositivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<Dispositivo> = req.body;
    const { data, error } = await supabase
      .from('dispositivos')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
