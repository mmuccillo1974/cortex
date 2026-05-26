-- CORTEX MVP: base compartilhada para dados de teste.
-- Nesta fase, a aplicacao publica pode consultar e editar registros.
-- Antes de uso com dados reais, substitua as politicas por autenticacao.

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  tipo text not null default 'projeto',
  ordem text,
  projeto text not null,
  categoria text,
  valor_ano numeric,
  sei text,
  contrato text,
  descricao text,
  area text,
  status text,
  comentarios text,
  prazo date,
  arquivo jsonb,
  origem text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.atualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registros_updated_at on public.registros;
create trigger registros_updated_at
before update on public.registros
for each row execute function public.atualizar_updated_at();

alter table public.registros enable row level security;

grant select, insert, update, delete on table public.registros to anon;

drop policy if exists "MVP permite consulta publica" on public.registros;
create policy "MVP permite consulta publica"
on public.registros for select to anon
using (true);

drop policy if exists "MVP permite inclusao publica" on public.registros;
create policy "MVP permite inclusao publica"
on public.registros for insert to anon
with check (true);

drop policy if exists "MVP permite atualizacao publica" on public.registros;
create policy "MVP permite atualizacao publica"
on public.registros for update to anon
using (true)
with check (true);

drop policy if exists "MVP permite exclusao publica" on public.registros;
create policy "MVP permite exclusao publica"
on public.registros for delete to anon
using (true);
