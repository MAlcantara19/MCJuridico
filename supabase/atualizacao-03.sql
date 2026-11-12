-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 03
-- Tabela de serviços igual às artes, títulos editáveis, ícones das áreas
-- e acessos ao painel (master e admin).
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Colunas novas ----------
alter table configuracoes add column if not exists titulo_servicos text default 'Tabela de serviços';
alter table configuracoes add column if not exists sub_servicos text default 'Atendimento 100% remoto para todo o Brasil · Hora avulsa R$ 40 a R$ 60';
alter table configuracoes add column if not exists nota_servicos text default 'Valores de referência. O orçamento final depende do volume e do prazo.';
alter table configuracoes add column if not exists titulo_correspondente text default 'Correspondente jurídica';
alter table configuracoes add column if not exists sub_correspondente text default 'Diligências presenciais para escritórios de qualquer comarca';
alter table configuracoes add column if not exists titulo_pacotes text default 'Pacotes mensais';
alter table configuracoes add column if not exists sub_pacotes text default 'Horas fixas por mês, com prioridade no atendimento';
alter table configuracoes add column if not exists rotulo_teste text default 'Experimente';
alter table categorias add column if not exists icone text default 'documento';

-- Preenche os títulos que estiverem vazios
update configuracoes set
  titulo_servicos = coalesce(nullif(titulo_servicos, ''), 'Tabela de serviços'),
  sub_servicos = coalesce(nullif(sub_servicos, ''), 'Atendimento 100% remoto para todo o Brasil · Hora avulsa R$ 40 a R$ 60'),
  titulo_correspondente = coalesce(nullif(titulo_correspondente, ''), 'Correspondente jurídica'),
  sub_correspondente = coalesce(nullif(sub_correspondente, ''), 'Diligências presenciais para escritórios de qualquer comarca'),
  titulo_pacotes = coalesce(nullif(titulo_pacotes, ''), 'Pacotes mensais'),
  sub_pacotes = coalesce(nullif(sub_pacotes, ''), 'Horas fixas por mês, com prioridade no atendimento'),
  rotulo_teste = coalesce(nullif(rotulo_teste, ''), 'Experimente')
where id = 1;

-- ---------- Ícones das áreas (iguais às artes) ----------
update categorias set icone = 'balanca'  where nome ilike 'Suporte administrativo%';
update categorias set icone = 'carteira' where nome ilike 'Financeiro%';
update categorias set icone = 'monitor'  where nome ilike 'Digital%';
update categorias set icone = 'loja'     where nome ilike 'Suporte a pequenos%';
update categorias set icone = 'maleta'   where modalidade = 'presencial';

-- ---------- Ajustes conforme as artes ----------
-- "Mais procurado" é o pacote Jurídico
update pacotes set destaque = (nome = 'Jurídico') where grupo = 'mensal';

-- Relatório com fotos incluso na lista de diligências
insert into servicos (categoria_id, nome, preco, ordem)
select c.id, 'Relatório com fotos da diligência', 'incluso', 99
from categorias c
where c.modalidade = 'presencial'
  and not exists (select 1 from servicos s where s.nome = 'Relatório com fotos da diligência')
order by c.ordem
limit 1;

update configuracoes set
  observacoes_correspondente = E'Custas, taxas, cópias e deslocamentos longos são repassados ao cliente.',
  area_atendimento = E'Atendimento presencial em Três Rios/RJ.\nParaíba do Sul/RJ: valor do serviço + custo de deslocamento.\nOutras comarcas sob consulta.'
where id = 1;

-- ---------- Acessos ao painel ----------
-- Remove os e-mails de exemplo e libera os dois e-mails reais.
delete from perfis where email in ('SEU-EMAIL@gmail.com', 'EMAIL-DA-MARIA@gmail.com') or email like 'novo-%@trocar.com';

insert into perfis (email, nome, papel) values
  ('matheusalcan19@gmail.com', 'Matheus', 'master'),
  ('vitraforma@gmail.com', 'Maria Carolina', 'admin')
on conflict (email) do update set papel = excluded.papel, nome = excluded.nome;

-- Conferência: deve mostrar os dois e-mails com seus papéis
select email, nome, papel from perfis order by papel desc;
