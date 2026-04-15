import { Request, Response } from 'express';
import { requireServerDb } from '../lib/supabaseServer';
import { Dispositivo } from '../interfaces/database.types';

export const getDispositivos = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const viviendaId = (req.query.viviendaId ?? req.query.vivienda_id) as string | undefined;
    const ambienteId = (req.query.ambienteId ?? req.query.ambiente_id) as string | undefined;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Obtener viviendas del usuario para validar acceso
    const { data: userViviendas } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map(v => v.id) || [];
    if (viviendaIds.length === 0) {
      // Sin viviendas no hay dispositivos accesibles.
      // Si el cliente pide algo puntual, devolvemos 403; si no, lista vacía.
      if (viviendaId || ambienteId) {
        return res.status(403).json({ message: 'No tienes acceso' });
      }
      return res.json([]);
    }

    // Filtro por ambiente (prioritario)
    if (ambienteId) {
      const { data: ambiente, error: ambienteError } = await db
        .from('ambientes')
        .select('id, vivienda_id')
        .eq('id', ambienteId)
        .in('vivienda_id', viviendaIds)
        .maybeSingle();

      if (ambienteError) throw ambienteError;
      if (!ambiente) {
        return res.status(403).json({ message: 'No tienes acceso a este ambiente' });
      }

      const { data, error } = await db
        .from('dispositivos')
        .select('*')
        .eq('ambiente_id', ambienteId);

      if (error) throw error;
      return res.json(data);
    }

    // Filtro por vivienda -> listar ambientes de esa vivienda y luego dispositivos
    if (viviendaId) {
      if (!viviendaIds.includes(viviendaId)) {
        return res.status(403).json({ message: 'No tienes acceso a esta vivienda' });
      }

      const { data: ambientes, error: ambientesError } = await db
        .from('ambientes')
        .select('id')
        .eq('vivienda_id', viviendaId);
      if (ambientesError) throw ambientesError;

      const ambienteIds = ambientes?.map((a) => a.id) || [];
      if (ambienteIds.length === 0) {
        return res.json([]);
      }

      const { data, error } = await db
        .from('dispositivos')
        .select('*')
        .in('ambiente_id', ambienteIds);
      if (error) throw error;
      return res.json(data);
    }

    // Sin filtros: devolver dispositivos de todos los ambientes de todas las viviendas del usuario
    const { data: ambientes, error: ambientesError } = await db
      .from('ambientes')
      .select('id')
      .in('vivienda_id', viviendaIds);
    if (ambientesError) throw ambientesError;

    const ambienteIds = ambientes?.map((a) => a.id) || [];
    if (ambienteIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await db
      .from('dispositivos')
      .select('*')
      .in('ambiente_id', ambienteIds);
    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDispositivoById = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const { id } = req.params;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Obtener viviendas del usuario
    const { data: userViviendas } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map(v => v.id) || [];

    // Obtener ambientes accesibles
    const { data: ambientes, error: ambientesError } = await db
      .from('ambientes')
      .select('id')
      .in('vivienda_id', viviendaIds);
    if (ambientesError) throw ambientesError;
    const ambienteIds = ambientes?.map((a) => a.id) || [];

    if (ambienteIds.length === 0) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    const { data, error } = await db
      .from('dispositivos')
      .select('*')
      .eq('id', id)
      .in('ambiente_id', ambienteIds)
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
    const db = requireServerDb(res);
    if (!db) return;

    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const nuevoDispositivo: Partial<Dispositivo> = req.body;
    const { ambiente_id } = nuevoDispositivo;

    if (!ambiente_id) {
      return res.status(400).json({ message: 'ambiente_id es requerido' });
    }

    // Validar ownership: solo permitir crear en ambiente de vivienda del usuario
    const { data: ambiente, error: ambienteError } = await db
      .from('ambientes')
      .select('id, vivienda_id')
      .eq('id', ambiente_id)
      .maybeSingle();

    if (ambienteError) throw ambienteError;
    if (!ambiente) {
      return res.status(404).json({ message: 'Ambiente no encontrado' });
    }

    const { data: viviendaOwner, error: viviendaOwnerError } = await db
      .from('viviendas')
      .select('id')
      .eq('id', ambiente.vivienda_id)
      .eq('usuario_id', usuario_id)
      .maybeSingle();
    if (viviendaOwnerError) throw viviendaOwnerError;
    if (!viviendaOwner) {
      return res.status(403).json({ message: 'No tienes acceso a este ambiente' });
    }

    if (!nuevoDispositivo.nombre?.trim() || !nuevoDispositivo.tipo?.trim()) {
      return res.status(400).json({ message: 'nombre y tipo son requeridos' });
    }

    // Evitar que el cliente fuerce campos sensibles
    const insertPayload: Partial<Dispositivo> = {
      nombre: nuevoDispositivo.nombre,
      tipo: nuevoDispositivo.tipo,
      zona: nuevoDispositivo.zona ?? null,
      estado: nuevoDispositivo.estado,
      en_linea: nuevoDispositivo.en_linea ?? null,
      ultima_actividad: nuevoDispositivo.ultima_actividad ?? null,
      ambiente_id: ambiente_id,
    };

    const { data, error } = await db
      .from('dispositivos')
      .insert([insertPayload])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDispositivo = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const { id } = req.params;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Whitelist de campos actualizables desde el cliente.
    const inputUpdates = req.body as Partial<Dispositivo>;
    const updates: Partial<Dispositivo> = {};
    const allowedKeys: Array<keyof Dispositivo> = [
      'nombre',
      'tipo',
      'zona',
      'estado',
      'en_linea',
      'ultima_actividad',
      'ambiente_id',
    ];
    for (const key of allowedKeys) {
      if (key in inputUpdates) {
        updates[key] = inputUpdates[key] as any;
      }
    }

    // Obtener viviendas del usuario
    const { data: userViviendas } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map(v => v.id) || [];

    // Ambientes permitidos dentro de viviendas del usuario
    const { data: ambientesPermitidos, error: ambientesError } = await db
      .from('ambientes')
      .select('id')
      .in('vivienda_id', viviendaIds);
    if (ambientesError) throw ambientesError;
    const ambienteIdsPermitidos = ambientesPermitidos?.map((a) => a.id) || [];

    if (ambienteIdsPermitidos.length === 0) {
      return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });
    }

    // Si quiere mover de ambiente, validar ownership del ambiente destino
    if (updates.ambiente_id && !ambienteIdsPermitidos.includes(updates.ambiente_id)) {
      return res.status(403).json({ message: 'No tienes acceso al ambiente destino' });
    }

    const { data, error } = await db
      .from('dispositivos')
      .update(updates)
      .eq('id', id)
      .in('ambiente_id', ambienteIdsPermitidos)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });

    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/dispositivos/:id
 * Éxito: 200 + JSON (para clientes que siempre parsean body; evita 204 vacío en Flutter/http).
 * Cuerpo: { status: 'success', message: string }
 */
export const deleteDispositivo = async (req: Request, res: Response) => {
  try {
    const db = requireServerDb(res);
    if (!db) return;

    const { id } = req.params;
    const usuario_id = req.user?.id;
    if (!usuario_id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { data: userViviendas } = await db
      .from('viviendas')
      .select('id')
      .eq('usuario_id', usuario_id);

    const viviendaIds = userViviendas?.map((v) => v.id) || [];

    const { data: ambientesPermitidos, error: ambientesError } = await db
      .from('ambientes')
      .select('id')
      .in('vivienda_id', viviendaIds);
    if (ambientesError) throw ambientesError;
    const ambienteIdsPermitidos = ambientesPermitidos?.map((a) => a.id) || [];

    if (ambienteIdsPermitidos.length === 0) {
      return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });
    }

    const { data, error } = await db
      .from('dispositivos')
      .delete()
      .eq('id', id)
      .in('ambiente_id', ambienteIdsPermitidos)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Dispositivo eliminado',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
