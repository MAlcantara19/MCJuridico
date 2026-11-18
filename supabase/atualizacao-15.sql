-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 15 (Fase 2)
-- Pedidos com código, etapas e prazo · observações internas (texto/áudio)
-- · horas de pacote · etiquetas · área do cliente (link + código)
-- · envio de documentos e comprovante pelo cliente · restaurar backup/modelo.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Pedidos (os "serviços" do Financeiro viram pedidos com código) ----------
alter table atendimentos add column if not exists codigo text;
alter table atendimentos add column if not exists prazo date;
alter table atendimentos add column if not exists visivel_cliente boolean default true;
alter table atendimentos add column if not exists pagamento_informado boolean default false;
alter table atendimentos add column if not exists comprovante_cliente text;

create sequence if not exists pedido_seq;

-- Dá código aos pedidos antigos (MC-0001, MC-0002...) na ordem em que foram criados
do $$
declare r record;
begin
  for r in select id from atendimentos where codigo is null order by id loop
    update atendimentos set codigo = 'MC-' || lpad(nextval('pedido_seq')::text, 4, '0') where id = r.id;
  end loop;
end $$;

create or replace function public.dar_codigo_pedido() returns trigger
language plpgsql as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'MC-' || lpad(nextval('pedido_seq')::text, 4, '0');
  end if;
  return new;
end $$;
drop trigger if exists pedido_codigo on atendimentos;
create trigger pedido_codigo before insert on atendimentos for each row execute function public.dar_codigo_pedido();
create unique index if not exists atendimentos_codigo on atendimentos (codigo);

-- ---------- Clientes: etiquetas, horas do pacote e acesso à área do cliente ----------
alter table clientes add column if not exists etiquetas text[] default '{}';
alter table clientes add column if not exists horas_mes numeric(6, 1) default 0;
alter table clientes add column if not exists mostrar_horas boolean default false;
alter table clientes add column if not exists acesso_token text;
alter table clientes add column if not exists acesso_pin text;
alter table clientes add column if not exists pin_erros int default 0;
alter table clientes add column if not exists pin_bloqueio timestamptz;
create unique index if not exists clientes_acesso_token on clientes (acesso_token) where acesso_token is not null;

-- ---------- Observações internas do pedido (só o painel vê) ----------
create table if not exists notas_pedido (
  id bigint generated always as identity primary key,
  atendimento_id bigint references atendimentos(id) on delete cascade,
  tipo text default 'texto',             -- texto | audio
  texto text default '',
  caminho text default '',               -- áudio na pasta privada
  autor text default '',
  criado_em timestamptz default now()
);

-- ---------- Horas trabalhadas (pacotes) ----------
create table if not exists horas (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  atendimento_id bigint references atendimentos(id) on delete set null,
  data date not null default current_date,
  minutos int not null default 0,
  descricao text default '',
  criado_em timestamptz default now()
);
create index if not exists horas_cliente_data on horas (cliente_id, data);

-- ---------- Arquivos enviados pelo cliente ----------
create table if not exists envios (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  atendimento_id bigint references atendimentos(id) on delete cascade,
  nome text default '',
  caminho text default '',
  tamanho bigint default 0,
  tipo text default 'documento',         -- documento | comprovante
  visto boolean default false,
  criado_em timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array['notas_pedido', 'horas', 'envios'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin altera" on %I', t);
    execute format('create policy "admin altera" on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant all on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- Área do cliente: conferência do link + código ----------
-- Devolve o id do cliente se o link e o código estiverem certos.
-- 5 códigos errados bloqueiam por 15 minutos.
create or replace function public.cliente_conferir(token text, pin text) returns bigint
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if length(coalesce(token, '')) < 32 then return null; end if;
  select id, acesso_pin, pin_erros, pin_bloqueio into c from clientes where acesso_token = token;
  if c.id is null then return null; end if;
  if c.pin_bloqueio is not null and c.pin_bloqueio > now() then raise exception 'bloqueado'; end if;
  if coalesce(c.acesso_pin, '') = '' or c.acesso_pin <> coalesce(pin, '') then
    update clientes set pin_erros = coalesce(pin_erros, 0) + 1,
      pin_bloqueio = case when coalesce(pin_erros, 0) + 1 >= 5 then now() + interval '15 minutes' else null end
    where id = c.id;
    return null;
  end if;
  update clientes set pin_erros = 0, pin_bloqueio = null where id = c.id;
  return c.id;
end $$;

-- O link existe? (usado pela pasta de envios, sem o código)
create or replace function public.token_valido(token text) returns boolean
language sql security definer set search_path = public stable as $$
  select length(coalesce(token, '')) >= 32 and exists (select 1 from clientes where acesso_token = token);
$$;

-- Tudo o que o cliente pode ver
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

-- Registra um arquivo que o cliente enviou (documento ou comprovante de pagamento)
create or replace function public.cliente_registrar_envio(token text, pin text, pedido bigint, nome text, caminho text, tamanho bigint, tipo text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  cid := public.cliente_conferir(token, pin);
  if cid is null then return false; end if;
  if tipo not in ('documento', 'comprovante') then return false; end if;
  if left(coalesce(caminho, ''), length(token) + 1) <> token || '/' then return false; end if;
  if not exists (select 1 from atendimentos a where a.id = pedido and a.cliente_id = cid) then return false; end if;
  insert into envios (cliente_id, atendimento_id, nome, caminho, tamanho, tipo)
  values (cid, pedido, left(coalesce(nome, ''), 200), caminho, coalesce(tamanho, 0), tipo);
  if tipo = 'comprovante' then
    update atendimentos set pagamento_informado = true, comprovante_cliente = caminho where id = pedido;
  end if;
  return true;
end $$;

revoke all on function public.cliente_conferir(text, text) from public;
revoke all on function public.cliente_area(text, text) from public;
revoke all on function public.cliente_registrar_envio(text, text, bigint, text, text, bigint, text) from public;
revoke all on function public.token_valido(text) from public;
grant execute on function public.cliente_area(text, text) to anon, authenticated;
grant execute on function public.cliente_registrar_envio(text, text, bigint, text, text, bigint, text) to anon, authenticated;
grant execute on function public.token_valido(text) to anon, authenticated;

-- ---------- Pasta privada de envios dos clientes ----------
insert into storage.buckets (id, name, public) values ('envios', 'envios', false)
on conflict (id) do update set public = false;

drop policy if exists "envios cliente insere" on storage.objects;
drop policy if exists "envios admin le" on storage.objects;
drop policy if exists "envios admin apaga" on storage.objects;
create policy "envios cliente insere" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'envios' and public.token_valido((storage.foldername(name))[1]));
create policy "envios admin le" on storage.objects for select to authenticated using (bucket_id = 'envios' and public.eh_admin());
create policy "envios admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'envios' and public.eh_admin());

-- ---------- Restaurar backup / importar modelo (só o master) ----------
-- Substitui o conteúdo das tabelas escolhidas pelo do arquivo. "perfis" (acessos) nunca é alterado.
create or replace function public.restaurar_dados(dados jsonb, tabelas text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ordem text[] := array['configuracoes', 'categorias', 'servicos', 'pacotes', 'formacoes', 'documentos', 'perguntas',
                        'depoimentos', 'respostas', 'solicitacoes', 'arquivos_privados', 'clientes', 'atendimentos',
                        'agenda', 'relatorios', 'orcamentos', 'despesas', 'notas_pedido', 'horas', 'envios'];
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
revoke all on function public.restaurar_dados(jsonb, text[]) from public;
grant execute on function public.restaurar_dados(jsonb, text[]) to authenticated;
