-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 08
-- Diligência completa (relatórios salvos), orçamentos, cobrança
-- e contador do "Quero um site assim".
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- Relatórios de diligência salvos (ficam na ficha do cliente)
create table if not exists relatorios (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete set null,
  atendimento_id bigint references atendimentos(id) on delete set null,
  dados jsonb default '{}'::jsonb,
  fotos jsonb default '[]'::jsonb,         -- [{ caminho, legenda }] na pasta privada
  criado_em timestamptz default now()
);

-- Orçamentos gerados (histórico na ficha do cliente)
create table if not exists orcamentos (
  id bigint generated always as identity primary key,
  numero text default '',
  cliente_id bigint references clientes(id) on delete set null,
  itens jsonb default '[]'::jsonb,         -- [{ nome, qtd, valor }]
  desconto numeric(12, 2) default 0,
  total numeric(12, 2) default 0,
  validade_dias int default 7,
  observacoes text default '',
  status text default 'enviado',           -- enviado | aprovado | recusado
  criado_em timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array['relatorios', 'orcamentos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin altera" on %I', t);
    execute format('create policy "admin altera" on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant all on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- Mensagem de cobrança (editável em Textos e contatos)
alter table configuracoes add column if not exists mensagem_cobranca text default 'Olá{responsavel}! Tudo bem? Passando para lembrar do pagamento referente a *{servico}* ({data}), no valor de *{valor}*. Se já tiver feito, pode desconsiderar. Obrigada! 😊';

-- Contador do botão "Quero um site assim" (crédito do desenvolvedor)
drop policy if exists "visitante registra" on cliques;
create policy "visitante registra" on cliques for insert to anon, authenticated
  with check (tipo in ('visita', 'whatsapp', 'assistente', 'credito'));
