import { Request, Response } from 'express';
import { requireServerDb } from '../lib/supabaseServer';
import { Dispositivo } from '../interfaces/database.types';

/** Normaliza tipo para comparaciones (p. ej. frontend en minúsculas: `termostato`). */
function tipoNormalizado(tipo: string): string {
  return tipo.trim().toLowerCase();
}

/**
 * Contrato `estado` para tipo termostato (POST/PATCH):
 * - Objeto JSON (no array).
 * - `temp_objetivo`: número finito (acepta string numérico, p. ej. `"22.5"`).
 * - `modo`: entero 0–3 (acepta string entero, p. ej. `"2"`; rechaza `"2.5"`).
 * - `humedad`: opcional; si viene, número finito (acepta string numérico).
 * Otras claves del objeto se conservan tal cual (p. ej. campos extra del cliente).
 * Devuelve el mismo objeto con temp_objetivo / modo / humedad normalizados a number.
 */
type ParseEstadoTermostatoOk = { ok: true; estado: Record<string, unknown> };
type ParseEstadoTermostatoErr = { ok: false; message: string };

function coerceFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean' || typeof v === 'object') return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Entero 0–3; acepta number o string numérico entero. */
function coerceModo(v: unknown): number | null {
  const n = coerceFiniteNumber(v);
  if (n === null) return null;
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n > 3) return null;
  return n;
}

function parseNormalizarEstadoTermostato(estado: unknown): ParseEstadoTermostatoOk | ParseEstadoTermostatoErr {
  if (estado === null || estado === undefined) {
    return { ok: false, message: 'Para tipo termostato, estado es obligatorio (objeto JSON).' };
  }
  if (typeof estado !== 'object' || Array.isArray(estado)) {
    return { ok: false, message: 'Para tipo termostato, estado debe ser un objeto JSON.' };
  }
  const e = estado as Record<string, unknown>;
  if (!('temp_objetivo' in e) || e.temp_objetivo === null || e.temp_objetivo === undefined) {
    return {
      ok: false,
      message: 'Para tipo termostato, estado.temp_objetivo es obligatorio (número finito).',
    };
  }
  const temp = coerceFiniteNumber(e.temp_objetivo);
  if (temp === null) {
    return {
      ok: false,
      message: 'Para tipo termostato, estado.temp_objetivo debe ser un número finito (o string numérico).',
    };
  }
  if (!('modo' in e) || e.modo === null || e.modo === undefined) {
    return {
      ok: false,
      message: 'Para tipo termostato, estado.modo es obligatorio (entero 0–3, o string entero).',
    };
  }
  const modo = coerceModo(e.modo);
  if (modo === null) {
    return {
      ok: false,
      message: 'Para tipo termostato, estado.modo debe ser un entero entre 0 y 3 (o string entero, p. ej. "2").',
    };
  }
  let humedadNormalizada: number | undefined;
  if ('humedad' in e && e.humedad !== null && e.humedad !== undefined) {
    const h = coerceFiniteNumber(e.humedad);
    if (h === null) {
      return {
        ok: false,
        message: 'Para tipo termostato, estado.humedad (opcional) debe ser un número finito (o string numérico).',
      };
    }
    humedadNormalizada = h;
  }

  const out: Record<string, unknown> = { ...e };
  out.temp_objetivo = temp;
  out.modo = modo;
  if (humedadNormalizada !== undefined) {
    out.humedad = humedadNormalizada;
  }
  return { ok: true, estado: out };
}

/** Lista todos los dispositivos accesibles (ambientes de las viviendas del usuario). El filtro por tipo (p. ej. termostato) lo hace el cliente. */
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

/**
 * POST /api/dispositivos
 *
 * `tipo` no está acotado solo a "luz": acepta cualquier string no vacío (p. ej. `luz`, `termostato`,
 * `sensor`, …) según lo que permita la columna/enum en Supabase. Se recomienda minúsculas para
 * coincidir con enums típicos en PostgreSQL.
 *
 * Cuerpo típico (whitelist de columnas insertables desde el cliente):
 * - ambiente_id (UUID), nombre, tipo, zona?, estado (jsonb), en_linea?, ultima_actividad?
 *
 * Ejemplo termostato (validación suave si tipo normalizado === "termostato"):
 * `{ "ambiente_id": "…", "nombre": "Living", "tipo": "termostato", "zona": "Living",
 *    "estado": { "temp_objetivo": 22.5, "modo": 2, "humedad": 45 } }`
 * (`humedad` opcional; `modo` entero 0–3. Strings numéricos se normalizan a number al persistir.)
 */
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

    const tipoTrim = nuevoDispositivo.tipo.trim();
    let estadoInsert: unknown = nuevoDispositivo.estado;
    if (tipoNormalizado(tipoTrim) === 'termostato') {
      const parsed = parseNormalizarEstadoTermostato(nuevoDispositivo.estado);
      if (!parsed.ok) {
        return res.status(400).json({ message: parsed.message });
      }
      estadoInsert = parsed.estado;
    }

    // Evitar que el cliente fuerce campos sensibles
    const insertPayload: Partial<Dispositivo> = {
      nombre: nuevoDispositivo.nombre.trim(),
      tipo: tipoTrim,
      zona: nuevoDispositivo.zona ?? null,
      estado: estadoInsert as Dispositivo['estado'],
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

/**
 * PATCH /api/dispositivos/:id
 * Contrato: mismo acceso que antes (dispositivos en ambientes de las viviendas del usuario).
 * Si el tipo efectivo es termostato y el body incluye `estado`, se parsea/normaliza como en POST.
 * Respuesta 200: fila completa del dispositivo tras el UPDATE (`.select()`), con `estado` persistido.
 */
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

    const { data: actualRow, error: fetchError } = await db
      .from('dispositivos')
      .select('tipo')
      .eq('id', id)
      .in('ambiente_id', ambienteIdsPermitidos)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!actualRow) {
      return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });
    }

    if (typeof updates.tipo === 'string') {
      updates.tipo = updates.tipo.trim();
    }
    if (typeof updates.nombre === 'string') {
      updates.nombre = updates.nombre.trim();
    }

    // Mismo parseo/normalización que POST si el tipo efectivo es termostato y el cliente envía estado.
    if ('estado' in updates) {
      const tipoEfectivo =
        updates.tipo !== undefined && typeof updates.tipo === 'string'
          ? updates.tipo
          : String(actualRow.tipo ?? '');
      if (tipoNormalizado(tipoEfectivo) === 'termostato') {
        const parsed = parseNormalizarEstadoTermostato(updates.estado);
        if (!parsed.ok) {
          return res.status(400).json({ message: parsed.message });
        }
        updates.estado = parsed.estado as Dispositivo['estado'];
      }
    }

    const { data, error } = await db
      .from('dispositivos')
      .update(updates)
      .eq('id', id)
      .in('ambiente_id', ambienteIdsPermitidos)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ message: 'Dispositivo no encontrado o no autorizado' });

    // Fila completa con `estado` ya guardado (útil para que el provider Flutter reemplace el ítem).
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
