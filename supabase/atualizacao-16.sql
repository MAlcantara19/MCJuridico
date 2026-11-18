-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 16
-- Mapa de comarcas · prazo automático por serviço (dias úteis) · assinatura
-- · histórico do pedido · avaliação ligada ao pedido.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Comarcas do mapa (aparecem no site) ----------
create table if not exists comarcas (
  id bigint generated always as identity primary key,
  nome text not null default '',
  uf text default 'RJ',
  lat double precision,
  lng double precision,
  tipo text default 'consulta',          -- base | deslocamento | consulta
  observacao text default '',            -- ex.: + R$ 30 de deslocamento
  ordem int default 0,
  ativo boolean default true
);
alter table comarcas enable row level security;
drop policy if exists "leitura publica" on comarcas;
drop policy if exists "admin altera" on comarcas;
create policy "leitura publica" on comarcas for select using (true);
create policy "admin altera" on comarcas for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
grant select on comarcas to anon;
grant all on comarcas to authenticated;

do $$
begin
  if (select count(*) from comarcas) = 0 then
    insert into comarcas (nome, uf, lat, lng, tipo, observacao, ordem) values
      ('Três Rios', 'RJ', -22.1169, -43.2092, 'base', 'Atendimento presencial', 1),
      ('Paraíba do Sul', 'RJ', -22.1585, -43.2926, 'deslocamento', 'Valor do serviço + deslocamento', 2),
      ('Areal', 'RJ', -22.2306, -43.1050, 'consulta', 'Sob consulta', 3),
      ('Comendador Levy Gasparian', 'RJ', -22.0400, -43.2050, 'consulta', 'Sob consulta', 4),
      ('Sapucaia', 'RJ', -21.9950, -42.9140, 'consulta', 'Sob consulta', 5),
      ('Paty do Alferes', 'RJ', -22.4280, -43.4190, 'consulta', 'Sob consulta', 6),
      ('Vassouras', 'RJ', -22.4040, -43.6630, 'consulta', 'Sob consulta', 7),
      ('Petrópolis', 'RJ', -22.5050, -43.1780, 'consulta', 'Sob consulta', 8);
  end if;
end $$;

-- ---------- Prazo automático e assinatura ----------
alter table servicos add column if not exists prazo_dias int;            -- dias úteis para entregar
alter table configuracoes add column if not exists assinatura_url text default '';
alter table configuracoes add column if not exists mostrar_mapa boolean default true;

update servicos set prazo_dias = 2 where prazo_dias is null and (nome ilike 'Protocolo%' or nome ilike 'Emissão de certidões%');
update servicos set prazo_dias = 3 where prazo_dias is null and (nome ilike 'Diligências em fóruns%' or nome ilike 'Extração de cópias%' or nome ilike 'Consulta presencial%' or nome ilike 'Retirada e entrega%');
update servicos set prazo_dias = 5 where prazo_dias is null and (nome ilike 'Certidões presenciais%' or nome ilike 'Pesquisa em cartório%' or nome ilike 'Digitação%' or nome ilike 'Montagem de pastas%');

-- ---------- Cobrança em lote: lembra quando cada cliente foi cobrado ----------
alter table clientes add column if not exists cobrado_em timestamptz;

-- ---------- Avaliação ligada ao pedido + pesquisa rápida de satisfação ----------
alter table depoimentos add column if not exists pedido text default '';
alter table depoimentos add column if not exists pontos text[] default '{}';
-- Avaliações ainda não aprovadas deixam de ser visíveis para o público (só o painel vê)
drop policy if exists "leitura publica" on depoimentos;
create policy "leitura publica" on depoimentos for select using (ativo = true);
drop policy if exists "cliente avalia" on depoimentos;
create policy "cliente avalia" on depoimentos for insert to anon, authenticated
  with check (ativo = false and origem = 'avaliacao' and nota between 1 and 5 and length(texto) <= 1200
              and length(coalesce(pedido, '')) <= 20 and coalesce(array_length(pontos, 1), 0) <= 8);

-- ---------- Histórico do pedido (quem mudou a etapa e quando) ----------
create table if not exists historico_pedido (
  id bigint generated always as identity primary key,
  atendimento_id bigint references atendimentos(id) on delete cascade,
  status text not null,
  autor text default '',
  criado_em timestamptz default now()
);
create index if not exists historico_pedido_atendimento on historico_pedido (atendimento_id, criado_em);
alter table historico_pedido enable row level security;
drop policy if exists "admin altera" on historico_pedido;
create policy "admin altera" on historico_pedido for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
revoke all on historico_pedido from anon;
grant all on historico_pedido to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into historico_pedido (atendimento_id, status, autor)
    values (new.id, new.status, coalesce(split_part(auth.jwt() ->> 'email', '@', 1), ''));
  end if;
  return new;
end $$;
drop trigger if exists pedido_historico on atendimentos;
create trigger pedido_historico after insert or update of status on atendimentos
  for each row execute function public.registrar_historico();

-- Pedidos antigos ganham o primeiro registro (situação atual)
insert into historico_pedido (atendimento_id, status, autor, criado_em)
select a.id, a.status, '', coalesce(a.criado_em, now())
from atendimentos a
where not exists (select 1 from historico_pedido h where h.atendimento_id = a.id);

-- ---------- Área do cliente agora mostra as datas de cada etapa ----------
create or replace function public.cliente_area(token text, pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cid bigint; cli record; resultado jsonb; inicio date := date_trunc('month', current_date)::date;
begin
  cid := public.cliente_conferir(token, pin);
  if cid is null then return null; end if;
  select nome, responsavel, horas_mes, mostrar_horas into cli from clientes where id = cid;

  select jsonb_build_object(
    'cliente', jsonb_build_object('nome', cli.nome, 'responsavel', cli.responsavel),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'codigo', a.codigo, 'servico', a.servico, 'descricao', a.descricao, 'processo', a.processo,
        'status', a.status, 'data', a.data, 'prazo', a.prazo, 'valor', a.valor, 'pago', a.pago,
        'data_pagamento', a.data_pagamento, 'forma_pagamento', a.forma_pagamento,
        'pagamento_informado', a.pagamento_informado,
        'checklist', (select s.checklist from servicos s where s.nome = a.servico limit 1),
        'checklist_feito', a.checklist_feito,
        'historico', coalesce((select jsonb_agg(jsonb_build_object('status', h.status, 'criado_em', h.criado_em) order by h.criado_em)
                               from historico_pedido h where h.atendimento_id = a.id), '[]'::jsonb),
        'envios', coalesce((select jsonb_agg(jsonb_build_object('nome', e.nome, 'tipo', e.tipo, 'criado_em', e.criado_em) order by e.criado_em)
                            from envios e where e.atendimento_id = a.id), '[]'::jsonb)
      ) order by a.data desc, a.id desc)
      from atendimentos a
      where a.cliente_id = cid and coalesce(a.visivel_cliente, true) and a.status <> 'cancelado'
    ), '[]'::jsonb),
    'orcamentos', coalesce((
      select jsonb_agg(jsonb_build_object('numero', o.numero, 'total', o.total, 'status', o.status, 'criado_em', o.criado_em,
                                          'itens', o.itens, 'validade_dias', o.validade_dias) order by o.criado_em desc)
      from orcamentos o where o.cliente_id = cid
    ), '[]'::jsonb),
    'horas', case when cli.mostrar_horas then jsonb_build_object(
      'contratadas', cli.horas_mes,
      'usadas', coalesce((select sum(h.minutos) from horas h where h.cliente_id = cid and h.data >= inicio), 0) / 60.0
    ) else null end
  ) into resultado;
  return resultado;
end $$;


-- ---------- Restaurar/modelo passam a incluir comarcas e histórico ----------
create or replace function public.restaurar_dados(dados jsonb, tabelas text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ordem text[] := array['configuracoes', 'categorias', 'servicos', 'pacotes', 'formacoes', 'documentos', 'perguntas',
                        'depoimentos', 'respostas', 'solicitacoes', 'arquivos_privados', 'clientes', 'atendimentos',
                        'agenda', 'relatorios', 'orcamentos', 'despesas', 'notas_pedido', 'horas', 'envios',
                        'comarcas', 'historico_pedido'];
  t text; i int; total int := 0; n int; resumo jsonb := '{}'::jsonb;
begin
  if not public.eh_master() then raise exception 'Só o master pode restaurar'; end if;
  -- apaga dos "filhos" para os "pais"
  for i in reverse array_length(ordem, 1)..1 loop
    t := ordem[i];
    if t = any(tabelas) and dados -> 'tabelas' ? t then
      execute format('delete from %I', t);
    end if;
  end loop;
  -- insere dos "pais" para os "filhos"
  foreach t in array ordem loop
    if t = any(tabelas) and dados -> 'tabelas' ? t then
      execute format('insert into %I overriding system value select * from jsonb_populate_recordset(null::%I, $1)', t, t)
        using dados -> 'tabelas' -> t;
      get diagnostics n = row_count;
      total := total + n;
      resumo := resumo || jsonb_build_object(t, n);
      if t <> 'configuracoes' then
        execute format('select setval(pg_get_serial_sequence(%L, ''id''), greatest(coalesce((select max(id) from %I), 0), 1))', t, t);
      end if;
    end if;
  end loop;
  -- numeração dos pedidos continua de onde parou
  if 'atendimentos' = any(tabelas) then
    perform setval('pedido_seq', greatest(coalesce((select max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int) from atendimentos), 0), 1));
  end if;
  return jsonb_build_object('total', total, 'tabelas', resumo);
end $$;
