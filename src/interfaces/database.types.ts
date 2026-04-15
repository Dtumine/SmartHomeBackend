export interface Perfil {
  id: string; // UUID (auth.users.id)
  nombre_completo: string | null;
  actualizado_en: string | null; // ISO Timestamp
}

export interface Vivienda {
  id: string; // UUID
  usuario_id: string; // FK to Perfil.id
  nombre: string;
  direccion: string | null;
  consumo_semanal_kwh: number | null;
  creado_en: string | null; // ISO Timestamp
}

export interface Ambiente {
  id: string; // UUID
  vivienda_id: string; // FK to Vivienda.id
  nombre: string;
  descripcion: string | null;
  creado_en: string | null; // ISO Timestamp
}

export interface Dispositivo {
  id: string; // UUID
  ambiente_id: string; // FK to Ambiente.id
  // Campo legado para compatibilidad temporal (si existe en tu DB actual)
  vivienda_id?: string;
  nombre: string;
  tipo: string;
  zona: string | null;
  estado: any; // JSONB
  en_linea: boolean | null;
  ultima_actividad: string | null; // ISO Timestamp
}
