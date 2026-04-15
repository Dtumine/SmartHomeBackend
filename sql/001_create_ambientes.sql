-- 1) Crear tabla ambientes (intermedia entre viviendas y dispositivos)
create table if not exists public.ambientes (
  id uuid primary key default gen_random_uuid(),
  vivienda_id uuid not null references public.viviendas(id) on delete cascade,
  nombre text not null,
  descripcion text null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_ambientes_vivienda_id on public.ambientes(vivienda_id);

-- 2) Agregar ambiente_id a dispositivos
alter table public.dispositivos
  add column if not exists ambiente_id uuid null references public.ambientes(id) on delete cascade;

create index if not exists idx_dispositivos_ambiente_id on public.dispositivos(ambiente_id);

-- 3) Migrar datos existentes:
--    por cada vivienda, crear un ambiente "General" (si no existe)
insert into public.ambientes (vivienda_id, nombre, descripcion)
select v.id, 'General', 'Ambiente creado automaticamente por migracion'
from public.viviendas v
where not exists (
  select 1
  from public.ambientes a
  where a.vivienda_id = v.id
);

-- 4) Vincular dispositivos existentes al ambiente "General" de su vivienda
--    (solo para filas que aun no tengan ambiente_id)
update public.dispositivos d
set ambiente_id = a.id
from public.ambientes a
where d.ambiente_id is null
  and d.vivienda_id = a.vivienda_id
  and a.nombre = 'General';

-- 5) Opcional recomendado cuando ya hayas migrado frontend/back completo:
-- alter table public.dispositivos alter column ambiente_id set not null;
-- alter table public.dispositivos drop column vivienda_id;
