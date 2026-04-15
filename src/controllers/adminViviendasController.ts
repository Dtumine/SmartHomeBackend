import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const listAdminViviendas = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para listar viviendas por admin).',
      });
      return;
    }

    const rawUserId = req.query['usuario_id'];
    const usuarioId =
      typeof rawUserId === 'string' && rawUserId.trim()
        ? rawUserId.trim()
        : undefined;

    let viviendasQuery = supabaseAdmin.from('viviendas').select('*').order('creado_en', {
      ascending: false,
    });
    if (usuarioId) {
      viviendasQuery = viviendasQuery.eq('usuario_id', usuarioId);
    }

    const { data: viviendas, error: viviendasError } = await viviendasQuery;
    if (viviendasError) {
      res.status(400).json({ status: 'error', message: viviendasError.message });
      return;
    }

    const viviendaIds = (viviendas ?? []).map((v) => String(v.id));

    type AmbienteRow = Record<string, unknown> & {
      id?: string;
      vivienda_id?: string;
      dispositivos?: Array<Record<string, unknown>>;
    };

    let ambientesConDisp: AmbienteRow[] = [];

    if (viviendaIds.length > 0) {
      const { data: ambientes, error: ambError } = await supabaseAdmin
        .from('ambientes')
        .select('*')
        .in('vivienda_id', viviendaIds)
        .order('nombre', { ascending: true });

      if (ambError) {
        res.status(400).json({ status: 'error', message: ambError.message });
        return;
      }

      const ambienteIds = (ambientes ?? []).map((a) => String(a.id));
      let dispositivos: Array<Record<string, unknown>> = [];

      if (ambienteIds.length > 0) {
        const { data: dispData, error: dispError } = await supabaseAdmin
          .from('dispositivos')
          .select('id, ambiente_id, nombre, tipo, zona, en_linea')
          .in('ambiente_id', ambienteIds);

        if (dispError) {
          res.status(400).json({ status: 'error', message: dispError.message });
          return;
        }
        dispositivos = dispData ?? [];
      }

      const dispositivosByAmbiente = new Map<string, Array<Record<string, unknown>>>();
      for (const d of dispositivos) {
        const aid = String(d.ambiente_id ?? '');
        const cur = dispositivosByAmbiente.get(aid) ?? [];
        cur.push(d);
        dispositivosByAmbiente.set(aid, cur);
      }

      ambientesConDisp = (ambientes ?? []).map((a) => {
        const id = String(a.id ?? '');
        return {
          ...a,
          dispositivos: dispositivosByAmbiente.get(id) ?? [],
        };
      });
    }

    const ambientesByVivienda = new Map<string, AmbienteRow[]>();
    for (const a of ambientesConDisp) {
      const vid = String(a.vivienda_id ?? '');
      const list = ambientesByVivienda.get(vid) ?? [];
      list.push(a);
      ambientesByVivienda.set(vid, list);
    }

    const result = (viviendas ?? []).map((v) => {
      const id = String(v.id ?? '');
      const ambientesV = ambientesByVivienda.get(id) ?? [];
      const flatDispositivos = ambientesV.flatMap((a) => a.dispositivos ?? []);
      return {
        ...v,
        ambientes: ambientesV,
        dispositivos: flatDispositivos,
        total_dispositivos: flatDispositivos.length,
      };
    });

    res.json({ status: 'success', data: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al listar viviendas';
    res.status(500).json({ status: 'error', message });
  }
};

export const createAdminVivienda = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!supabaseAdmin) {
      res.status(503).json({
        status: 'error',
        message:
          'SUPABASE_SERVICE_ROLE_KEY no está configurada en el servidor (requerida para crear viviendas por admin).',
      });
      return;
    }

    const {
      usuario_id,
      nombre,
      direccion,
      consumo_semanal_kwh,
    }: {
      usuario_id?: string;
      nombre?: string;
      direccion?: string;
      consumo_semanal_kwh?: number | string;
    } = req.body ?? {};

    if (!usuario_id?.trim() || !nombre?.trim()) {
      res.status(400).json({
        status: 'error',
        message: 'usuario_id y nombre son obligatorios.',
      });
      return;
    }

    const cleanUserId = usuario_id.trim();
    const cleanNombre = nombre.trim();

    // Validar que el usuario exista en Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(cleanUserId);
    if (authError || !authData?.user) {
      res.status(400).json({
        status: 'error',
        message: 'El usuario indicado no existe en Auth.',
      });
      return;
    }

    const consumoNumber =
      typeof consumo_semanal_kwh === 'string'
        ? Number(consumo_semanal_kwh)
        : consumo_semanal_kwh;

    const insertPayload: Record<string, unknown> = {
      usuario_id: cleanUserId,
      nombre: cleanNombre,
      direccion: direccion?.trim() || null,
      consumo_semanal_kwh:
        typeof consumoNumber === 'number' && Number.isFinite(consumoNumber)
          ? consumoNumber
          : 0,
    };

    const { data, error } = await supabaseAdmin
      .from('viviendas')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      res.status(400).json({ status: 'error', message: error.message });
      return;
    }

    res.status(201).json({ status: 'success', data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al crear vivienda';
    res.status(500).json({ status: 'error', message });
  }
};

