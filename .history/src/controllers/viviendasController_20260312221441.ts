import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Vivienda } from '../interfaces/database.types';

export const getViviendas = async (req: Request, res: Response) => {
  try {
    const usuario_id = req.user?.id;
    console.log(`[getViviendas] Buscando viviendas para el usuario: ${usuario_id}`);
    
    const { data, error } = await supabase
      .from('viviendas')
      .select('*')
      .eq('usuario_id', usuario_id);

    if (error) {
      console.error('[getViviendas] Error de Supabase:', error);
      throw error;
    }

    console.log(`[getViviendas] Encontradas ${data?.length || 0} viviendas`);
    res.json(data);
  } catch (error: any) {
    console.error('[getViviendas] Error capturado:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message || 'Error desconocido al obtener viviendas',
      details: error
    });
  }
};

export const getViviendaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user?.id;
    const { data, error } = await supabase
      .from('viviendas')
      .select('*')
      .eq('id', id)
      .eq('usuario_id', usuario_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Vivienda no encontrada' });

    res.json(data);
  } catch (error: any) {
    console.error('[getViviendaById] Error capturado:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message || 'Error desconocido al obtener vivienda',
      details: error
    });
  }
};

export const createVivienda = async (req: Request, res: Response) => {
  try {
    const usuario_id = req.user?.id;
    const nuevaVivienda: Partial<Vivienda> = { ...req.body, usuario_id };
    console.log(`[createVivienda] Creando vivienda para el usuario: ${usuario_id}`);
    
    const { data, error } = await supabase
      .from('viviendas')
      .insert([nuevaVivienda])
      .select();

    if (error) {
      console.error('[createVivienda] Error de Supabase:', error);
      throw error;
    }

    console.log(`[createVivienda] Vivienda creada con éxito: ${data[0].id}`);
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error('[createVivienda] Error capturado:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message || 'Error desconocido al crear vivienda',
      details: error
    });
  }
};
