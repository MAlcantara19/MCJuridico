-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 05 (Meus arquivos: biblioteca particular)
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- Nada desta tabela nem da pasta "privado" aparece no site.
-- =====================================================================

create table if not exists arquivos_privados (
  id bigint generated always as identity primary key,
  titulo text not null default '',
  tipo text default 'arquivo',            -- arquivo | link
  url text default '',                    -- usado quando é link
  caminho text default '',                -- usado quando é arquivo
  pasta text default 'Geral',
  observacao text default '',
  favorito boolean default false,
  tamanho bigint default 0,
  criado_em timestamptz default now()
);

alter table arquivos_privados enable row level security;

-- Só quem está liberado no painel (perfis) vê e mexe. Visitantes não têm acesso nenhum.
drop policy if exists "admin altera" on arquivos_privados;
create policy "admin altera" on arquivos_privados for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

revoke all on arquivos_privados from anon;
grant all on arquivos_privados to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Pasta de arquivos PRIVADA (public = false): só abre com link temporário gerado pelo painel.
insert into storage.buckets (id, name, public)
values ('privado', 'privado', false)
on conflict (id) do update set public = false;

drop policy if exists "privado admin le" on storage.objects;
drop policy if exists "privado admin insere" on storage.objects;
drop policy if exists "privado admin altera" on storage.objects;
drop policy if exists "privado admin apaga" on storage.objects;
create policy "privado admin le" on storage.objects for select to authenticated using (bucket_id = 'privado' and public.eh_admin());
create policy "privado admin insere" on storage.objects for insert to authenticated with check (bucket_id = 'privado' and public.eh_admin());
create policy "privado admin altera" on storage.objects for update to authenticated using (bucket_id = 'privado' and public.eh_admin());
create policy "privado admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'privado' and public.eh_admin());
