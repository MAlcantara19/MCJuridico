-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 06 (Clientes, Financeiro e Agenda)
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- Tudo aqui é PRIVADO: só quem entra no painel vê. Nada aparece no site.
-- =====================================================================

create table if not exists clientes (
  id bigint generated always as identity primary key,
  nome text not null default '',
  tipo text default 'escritorio',          -- escritorio | advogado | empresa | pessoa
  responsavel text default '',
  documento text default '',
  telefone text default '',
  email text default '',
  cidade text default '',
  observacoes text default '',
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Serviços realizados / demandas (base do financeiro)
create table if not exists atendimentos (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete set null,
  servico text not null default '',
  descricao text default '',
  processo text default '',
  data date not null default current_date,
  valor numeric(12, 2) default 0,
  status text default 'concluido',         -- orcamento | a_fazer | andamento | concluido | cancelado
  pago boolean default false,
  data_pagamento date,
  forma_pagamento text default '',
  criado_em timestamptz default now()
);
create index if not exists atendimentos_data on atendimentos (data);
create index if not exists atendimentos_cliente on atendimentos (cliente_id);

-- Agenda de prazos, diligências e audiências
create table if not exists agenda (
  id bigint generated always as identity primary key,
  titulo text not null default '',
  tipo text default 'prazo',               -- prazo | diligencia | audiencia | reuniao | entrega | outro
  data date not null default current_date,
  hora time,
  cliente_id bigint references clientes(id) on delete set null,
  local text default '',
  processo text default '',
  observacoes text default '',
  feito boolean default false,
  criado_em timestamptz default now()
);
create index if not exists agenda_data on agenda (data);

do $$
declare t text;
begin
  foreach t in array array['clientes', 'atendimentos', 'agenda'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin altera" on %I', t);
    execute format('create policy "admin altera" on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant all on %I to authenticated', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;
