-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 02 (depoimentos)
-- Rode no Supabase > SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

create table if not exists depoimentos (
  id bigint generated always as identity primary key,
  nome text not null default '',
  cargo text default '',
  texto text default '',
  ordem int default 0,
  ativo boolean default true
);

alter table depoimentos enable row level security;

drop policy if exists "leitura publica" on depoimentos;
drop policy if exists "admin altera" on depoimentos;
create policy "leitura publica" on depoimentos for select using (true);
create policy "admin altera" on depoimentos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

grant select on depoimentos to anon;
grant all on depoimentos to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
