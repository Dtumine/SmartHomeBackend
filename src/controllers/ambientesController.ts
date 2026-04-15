import { Request, Response } from 'express';
import { requireServerDb } from '../lib/supabaseServer';
import { Ambiente } from '../interfaces/database.types';

export const getAmbientes = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const viviendaId = (req.query.viviendaId ?? req.query.vivienda_id) as string | undefined;

    const { data: userViviendas, error: viviendasError } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    if (viviendasError) throw viviendasError;
    const viviendaIds = userViviendas?.map((v) => v.id) || [];

    if (viviendaIds.length === 0) {
      return res.json([]);
    }

    let query = db.from('ambientes').select('*').in('vivienda_id', viviendaIds);

    if (viviendaId) {
      if (!viviendaIds.includes(viviendaId)) {
        return res.status(403).json({ message: 'No tienes acceso a esta vivienda' });
      }
      query = query.eq('vivienda_id', viviendaId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAmbienteById = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const { id } = req.params;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { data: userViviendas, error: viviendasError } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);
    if (viviendasError) throw viviendasError;

    const viviendaIds = userViviendas?.map((v) => v.id) || [];

    const { data, error } = await db
      .from('ambientes')
      .select('*')
      .eq('id', id)
      .in('vivienda_id', viviendaIds)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Ambiente no encontrado' });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAmbiente = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const nuevoAmbiente: Partial<Ambiente> = req.body;
    const vivienda_id = nuevoAmbiente.vivienda_id;

    if (!vivienda_id || !nuevoAmbiente.nombre?.trim()) {
      return res.status(400).json({ message: 'vivienda_id y nombre son requeridos' });
    }

    const { data: vivienda, error: viviendaError } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id)
      .eq('id', vivienda_id)
      .maybeSingle();
    if (viviendaError) throw viviendaError;
    if (!vivienda) {
      return res.status(403).json({ message: 'No tienes acceso a esta vivienda' });
    }

    const { data, error } = await db
      .from('ambientes')
      .insert([
        {
          vivienda_id,
          nombre: nuevoAmbiente.nombre.trim(),
          descripcion: nuevoAmbiente.descripcion ?? null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAmbiente = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const { id } = req.params;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const input = req.body as Partial<Ambiente>;

    const { data: userViviendas, error: viviendasError } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);
    if (viviendasError) throw viviendasError;
    const viviendaIds = userViviendas?.map((v) => v.id) || [];

    // Verificar que el ambiente pertenece a una vivienda del usuario
    const { data: ambienteActual, error: ambienteError } = await db
      .from('ambientes')
      .select('id, vivienda_id')
      .eq('id', id)
      .in('vivienda_id', viviendaIds)
      .maybeSingle();
    if (ambienteError) throw ambienteError;
    if (!ambienteActual) {
      return res.status(404).json({ message: 'Ambiente no encontrado o no autorizado' });
    }

    const updates: Partial<Ambiente> = {};
    if (typeof input.nombre === 'string') updates.nombre = input.nombre.trim();
    if ('descripcion' in input) updates.descripcion = input.descripcion ?? null;

    const { data, error } = await db
      .from('ambientes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
