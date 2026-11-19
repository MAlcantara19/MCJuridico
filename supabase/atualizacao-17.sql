-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 17
-- Deslocamento por km · feriados municipais · rota do dia · lembrete ao cliente
-- · notificações no celular do cliente · contrato de pacote · meta mensal
-- · alerta de nota baixa.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Deslocamento automático e meta do mês ----------
alter table configuracoes add column if not exists km_valor numeric(8, 2) default 1.20;      -- R$ por km
alter table configuracoes add column if not exists km_franquia numeric(8, 1) default 15;     -- km sem cobrança
alter table configuracoes add column if not exists km_ida_volta boolean default false;       -- cobra ida e volta
alter table configuracoes add column if not exists meta_mensal numeric(12, 2) default 0;

alter table comarcas add column if not exists km numeric(8, 1);                              -- distância pela estrada até a base

alter table atendimentos add column if not exists comarca text default '';
alter table atendimentos add column if not exists deslocamento numeric(10, 2) default 0;
alter table atendimentos add column if not exists lembrete_cliente_em timestamptz;

-- ---------- Agenda: rota do dia e lembrete ao cliente ----------
alter table agenda add column if not exists lat double precision;
alter table agenda add column if not exists lng double precision;
alter table agenda add column if not exists lembrar_cliente boolean default true;
alter table agenda add column if not exists lembrete_cliente_em timestamptz;

-- ---------- Avaliações: alerta de nota baixa ----------
alter table depoimentos add column if not exists criado_em timestamptz default now();
-- As que já existiam contam como lidas (o alerta vale só para as novas)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'depoimentos' and column_name = 'lida') then
    alter table depoimentos add column lida boolean default false;
    update depoimentos set lida = true;
  end if;
end $$;

-- ---------- Feriados municipais (editáveis no painel) ----------
create table if not exists feriados (
  id bigint generated always as identity primary key,
  data date not null,
  nome text default '',
  cidade text default '',
  recorrente boolean default true,       -- repete todo ano no mesmo dia
  ativo boolean default true
);
alter table feriados enable row level security;
drop policy if exists "leitura publica" on feriados;
drop policy if exists "admin altera" on feriados;
create policy "leitura publica" on feriados for select using (true);
create policy "admin altera" on feriados for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
grant select on feriados to anon;
grant all on feriados to authenticated;

do $$
begin
  if (select count(*) from feriados) = 0 then
    insert into feriados (data, nome, cidade, recorrente) values
      ('2026-01-15', 'Aniversário da cidade', 'Paraíba do Sul', true),
      ('2026-06-29', 'São Pedro e São Paulo (padroeiros)', 'Paraíba do Sul', true),
      ('2026-12-14', 'Aniversário da cidade', 'Três Rios', true);
  end if;
end $$;

-- ---------- Segredos: código do lembrete automático ----------
alter table segredos add column if not exists cron_token text default '';

-- ---------- Notificações no celular do cliente ----------
create table if not exists push_inscricoes (
  id bigint generated always as identity primary key,
  cliente_id bigint references clientes(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz default now()
);
alter table push_inscricoes enable row level security;
drop policy if exists "admin altera" on push_inscricoes;
create policy "admin altera" on push_inscricoes for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
revoke all on push_inscricoes from anon;
grant all on push_inscricoes to authenticated;

drop function if exists public.cliente_push_inscrever(text, text, text, text, text);
drop function if exists public.cliente_push_sair(text, text, text);
create or replace function public.cliente_push_inscrever(token text, pin text, ep text, chave text, segredo text) returns boolean
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  cid := public.cliente_conferir(token, pin);
  if cid is null then return false; end if;
  if left(coalesce(ep, ''), 8) <> 'https://' or length(ep) > 1000 or length(coalesce(chave, '')) > 200 or length(coalesce(segredo, '')) > 100 then return false; end if;
  insert into push_inscricoes as p (cliente_id, endpoint, p256dh, auth) values (cid, ep, chave, segredo)
  on conflict on constraint push_inscricoes_endpoint_key do update set cliente_id = excluded.cliente_id, p256dh = excluded.p256dh, auth = excluded.auth;
  -- no máximo 5 aparelhos por cliente
  delete from push_inscricoes where id in (
    select id from push_inscricoes where cliente_id = cid order by criado_em desc offset 5);
  return true;
end $$;

create or replace function public.cliente_push_sair(token text, pin text, ep text) returns boolean
language plpgsql security definer set search_path = public as $$
declare cid bigint;
begin
  cid := public.cliente_conferir(token, pin);
  if cid is null then return false; end if;
  delete from push_inscricoes p where p.cliente_id = cid and p.endpoint = ep;
  return true;
end $$;

revoke all on function public.cliente_push_inscrever(text, text, text, text, text) from public;
revoke all on function public.cliente_push_sair(text, text, text) from public;
grant execute on function public.cliente_push_inscrever(text, text, text, text, text) to anon, authenticated;
grant execute on function public.cliente_push_sair(text, text, text) to anon, authenticated;

-- ---------- Lembrete automático (chamado 1x por dia pela Vercel) ----------
-- Só funciona com o código secreto gerado no painel (Master > Notificações).
create or replace function public.lembretes_cron(codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(codigo, '')) < 32 or not exists (select 1 from segredos s where s.id = 1 and s.cron_token = codigo and s.cron_token <> '') then
    return null;
  end if;
  return jsonb_build_object(
    'feriados', coalesce((select jsonb_agg(jsonb_build_object('data', f.data, 'nome', f.nome, 'recorrente', f.recorrente)) from feriados f where f.ativo), '[]'::jsonb),
    'itens', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('tipo', 'agenda', 'id', a.id, 'cliente_id', a.cliente_id, 'titulo', a.titulo, 'categoria', a.tipo,
                                  'data', a.data, 'hora', a.hora, 'local', a.local, 'token', c.acesso_token,
                                  'subs', (select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from push_inscricoes p where p.cliente_id = a.cliente_id)) as x
        from agenda a join clientes c on c.id = a.cliente_id
        where not a.feito and coalesce(a.lembrar_cliente, true) and a.lembrete_cliente_em is null
          and a.data > current_date and a.data <= current_date + 7
          and exists (select 1 from push_inscricoes p where p.cliente_id = a.cliente_id)
        union all
        select jsonb_build_object('tipo', 'pedido', 'id', t.id, 'cliente_id', t.cliente_id, 'titulo', t.servico, 'codigo', t.codigo,
                                  'status', t.status, 'data', t.prazo, 'token', c.acesso_token,
                                  'subs', (select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from push_inscricoes p where p.cliente_id = t.cliente_id))
        from atendimentos t join clientes c on c.id = t.cliente_id
        where t.status in ('aguardando_docs', 'a_fazer', 'andamento') and coalesce(t.visivel_cliente, true) and t.lembrete_cliente_em is null
          and t.prazo > current_date and t.prazo <= current_date + 7
          and exists (select 1 from push_inscricoes p where p.cliente_id = t.cliente_id)
      ) q
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.lembretes_marcar(codigo text, agenda_ids bigint[], pedido_ids bigint[], vencidos text[]) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(codigo, '')) < 32 or not exists (select 1 from segredos s where s.id = 1 and s.cron_token = codigo and s.cron_token <> '') then
    return false;
  end if;
  update agenda set lembrete_cliente_em = now() where id = any(coalesce(agenda_ids, '{}'));
  update atendimentos set lembrete_cliente_em = now() where id = any(coalesce(pedido_ids, '{}'));
  delete from push_inscricoes where endpoint = any(coalesce(vencidos, '{}'));
  return true;
end $$;

revoke all on function public.lembretes_cron(text) from public;
revoke all on function public.lembretes_marcar(text, bigint[], bigint[], text[]) from public;
grant execute on function public.lembretes_cron(text) to anon, authenticated;
grant execute on function public.lembretes_marcar(text, bigint[], bigint[], text[]) to anon, authenticated;

-- ---------- Contrato de pacote mensal (aceite pelo link + WhatsApp) ----------
create table if not exists contratos (
  id bigint generated always as identity primary key,
  numero text default '',
  cliente_id bigint references clientes(id) on delete cascade,
  token text unique not null,
  pacote text default '',
  horas_mes numeric(6, 1) default 0,
  valor_mensal numeric(10, 2) default 0,
  hora_extra numeric(10, 2) default 0,
  dia_vencimento int default 10,
  inicio date default current_date,
  meses int default 12,
  clausulas text default '',
  status text default 'enviado',         -- rascunho | enviado | aceito | cancelado
  aceito_em timestamptz,
  aceito_nome text default '',
  criado_em timestamptz default now()
);
alter table contratos enable row level security;
drop policy if exists "admin altera" on contratos;
create policy "admin altera" on contratos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
revoke all on contratos from anon;
grant all on contratos to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- O cliente vê o contrato pelo link secreto
create or replace function public.contrato_ver(token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'numero', k.numero, 'pacote', k.pacote, 'horas_mes', k.horas_mes, 'valor_mensal', k.valor_mensal, 'hora_extra', k.hora_extra,
    'dia_vencimento', k.dia_vencimento, 'inicio', k.inicio, 'meses', k.meses, 'clausulas', k.clausulas,
    'status', k.status, 'aceito_em', k.aceito_em, 'aceito_nome', k.aceito_nome, 'criado_em', k.criado_em,
    'cliente', jsonb_build_object('nome', c.nome, 'responsavel', c.responsavel, 'documento', c.documento, 'cidade', c.cidade))
  from contratos k join clientes c on c.id = k.cliente_id
  where length(coalesce(contrato_ver.token, '')) >= 32 and k.token = contrato_ver.token and k.status <> 'cancelado';
$$;

-- O cliente aceita (fica registrado quem e quando)
create or replace function public.contrato_aceitar(token text, nome text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(token, '')) < 32 or length(trim(coalesce(nome, ''))) < 3 then return false; end if;
  update contratos k set status = 'aceito', aceito_em = now(), aceito_nome = left(trim(nome), 120)
  where k.token = contrato_aceitar.token and k.status = 'enviado';
  return found;
end $$;

revoke all on function public.contrato_ver(text) from public;
revoke all on function public.contrato_aceitar(text, text) from public;
grant execute on function public.contrato_ver(text) to anon, authenticated;
grant execute on function public.contrato_aceitar(text, text) to anon, authenticated;

-- ---------- Restaurar backup passa a incluir as tabelas novas ----------
create or replace function public.restaurar_dados(dados jsonb, tabelas text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ordem text[] := array['configuracoes', 'categorias', 'servicos', 'pacotes', 'formacoes', 'documentos', 'perguntas',
                        'depoimentos', 'respostas', 'solicitacoes', 'arquivos_privados', 'clientes', 'atendimentos',
                        'agenda', 'relatorios', 'orcamentos', 'despesas', 'notas_pedido', 'horas', 'envios',
                        'comarcas', 'historico_pedido', 'feriados', 'contratos'];
  t text; i int; total int := 0; n int; resumo jsonb := '{}'::jsonb;
begin
  if not public.eh_master() then raise exception 'Só o master pode restaurar'; end if;
  for i in reverse array_length(ordem, 1)..1 loop
    t := ordem[i];
    if t = any(tabelas) and dados -> 'tabelas' ? t then
      execute format('delete from %I', t);
    end if;
  end loop;
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
  if 'atendimentos' = any(tabelas) then
    perform setval('pedido_seq', greatest(coalesce((select max(nullif(regexp_replace(codigo, '\D', '', 'g'), '')::int) from atendimentos), 0), 1));
  end if;
  return jsonb_build_object('total', total, 'tabelas', resumo);
end $$;
revoke all on function public.restaurar_dados(jsonb, text[]) from public;
grant execute on function public.restaurar_dados(jsonb, text[]) to authenticated;
