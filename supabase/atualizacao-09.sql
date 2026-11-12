-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 09 (avaliações dos clientes)
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

alter table depoimentos add column if not exists nota int;                       -- 1 a 5 estrelas
alter table depoimentos add column if not exists autoriza boolean default true;  -- autorizou publicar
alter table depoimentos add column if not exists origem text default 'painel';   -- painel | avaliacao
alter table depoimentos add column if not exists criado_em timestamptz default now();

-- O cliente envia a avaliação pelo link; ela entra DESATIVADA e só aparece no site depois que a Maria aprovar.
drop policy if exists "cliente avalia" on depoimentos;
create policy "cliente avalia" on depoimentos for insert to anon, authenticated
  with check (ativo = false and origem = 'avaliacao' and nota between 1 and 5 and length(texto) <= 1200);
grant insert on depoimentos to anon;
grant usage, select on all sequences in schema public to anon;
