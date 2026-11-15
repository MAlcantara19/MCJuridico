-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 13
-- Pix copia e cola, temas prontos e agenda no celular (link de calendário).
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Pix e tema ----------
alter table configuracoes add column if not exists pix_chave text default '';
alter table configuracoes add column if not exists pix_nome text default 'Maria Carolina Costa';
alter table configuracoes add column if not exists pix_cidade text default 'Tres Rios';
alter table configuracoes add column if not exists tema_estilo text default 'classico';

-- Resposta pronta de pagamento passa a usar o Pix automático
update respostas
set texto = E'Olá, {nome}! 👋\n\nSegue o Pix para pagamento: 💰\n\n💠 *Pix copia e cola:*\n{pix}\n\nAssim que receber, te envio o recibo. 🧾'
where titulo = '💰 Dados para pagamento' and texto like '%• Pix: %';

-- ---------- Segredos (só o painel lê) ----------
create table if not exists segredos (
  id int primary key default 1 check (id = 1),
  agenda_token text default ''
);
insert into segredos (id) values (1) on conflict (id) do nothing;

alter table segredos enable row level security;
drop policy if exists "admin altera" on segredos;
create policy "admin altera" on segredos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());
revoke all on segredos from anon;
grant all on segredos to authenticated;

-- ---------- Agenda no celular ----------
-- Devolve a agenda só para quem tem o código secreto (usado pelo link .ics).
create or replace function public.agenda_ics(codigo text)
returns table (id bigint, titulo text, tipo text, data date, hora time, local text, processo text, observacoes text, feito boolean, cliente text)
language sql security definer set search_path = public stable as $$
  select a.id, a.titulo, a.tipo, a.data, a.hora, a.local, a.processo, a.observacoes, a.feito, c.nome
  from agenda a
  left join clientes c on c.id = a.cliente_id
  where length(coalesce(codigo, '')) >= 32
    and exists (select 1 from segredos s where s.id = 1 and s.agenda_token = codigo and s.agenda_token <> '')
    and a.data >= current_date - 60
  order by a.data, a.hora;
$$;

revoke all on function public.agenda_ics(text) from public;
grant execute on function public.agenda_ics(text) to anon, authenticated;
