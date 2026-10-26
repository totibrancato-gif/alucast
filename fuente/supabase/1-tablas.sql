-- =========================================================================
-- Alucast: tablas de la base de datos en Supabase.
-- Se corre una sola vez en el SQL Editor del proyecto (se puede volver a correr sin romper nada).
--
-- Cada empresa tiene sus datos; cada usuario pertenece a una empresa (tabla miembros)
-- y solo puede ver y cambiar los datos de la suya (Row Level Security).
-- Todos los datos de la app van en "registros", uno por cosa guardada:
--   tipo 'presupuesto' (id = número), 'movimiento' (id del movimiento),
--   'deudor' (id del deudor) y 'ajuste' (id = 'lista', 'empresa' o 'numero').
-- Lo borrado no se elimina: queda con borrado = true para que los otros equipos se enteren.
-- =========================================================================

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creada timestamptz not null default now()
);

create table if not exists public.miembros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade
);

-- Empresa del usuario que hace la consulta (null si no tiene).
create or replace function public.mi_empresa() returns uuid
language sql stable security definer set search_path = '' as $$
  select empresa_id from public.miembros where user_id = auth.uid()
$$;
revoke execute on function public.mi_empresa() from public, anon;
grant execute on function public.mi_empresa() to authenticated;

create table if not exists public.registros (
  empresa_id uuid not null default public.mi_empresa() references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in ('ajuste', 'presupuesto', 'movimiento', 'deudor')),
  id text not null,
  datos jsonb,
  borrado boolean not null default false,
  actualizado timestamptz not null default clock_timestamp(),
  actualizado_por uuid default auth.uid(),
  primary key (empresa_id, tipo, id)
);
create index if not exists registros_por_fecha on public.registros (empresa_id, actualizado);

-- La fecha de cada cambio la pone el servidor (no la compu, que puede tener la hora mal).
create or replace function public.registros_al_guardar() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := clock_timestamp();
  new.actualizado_por := auth.uid();
  return new;
end $$;
drop trigger if exists registros_al_guardar on public.registros;
create trigger registros_al_guardar before insert or update on public.registros
  for each row execute function public.registros_al_guardar();

-- ---- Seguridad: cada usuario ve solo lo de su empresa ----
alter table public.empresas enable row level security;
alter table public.miembros enable row level security;
alter table public.registros enable row level security;

revoke all on public.empresas, public.miembros, public.registros from anon;
revoke all on public.empresas, public.miembros, public.registros from authenticated;
grant select on public.empresas, public.miembros to authenticated;
grant select, insert, update on public.registros to authenticated;

drop policy if exists "ver mi empresa" on public.empresas;
create policy "ver mi empresa" on public.empresas for select to authenticated
  using (id = public.mi_empresa());

drop policy if exists "ver mi membresia" on public.miembros;
create policy "ver mi membresia" on public.miembros for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "ver registros de mi empresa" on public.registros;
create policy "ver registros de mi empresa" on public.registros for select to authenticated
  using (empresa_id = public.mi_empresa());

drop policy if exists "agregar registros a mi empresa" on public.registros;
create policy "agregar registros a mi empresa" on public.registros for insert to authenticated
  with check (empresa_id = public.mi_empresa());

drop policy if exists "cambiar registros de mi empresa" on public.registros;
create policy "cambiar registros de mi empresa" on public.registros for update to authenticated
  using (empresa_id = public.mi_empresa())
  with check (empresa_id = public.mi_empresa());
