-- =====================================================================
-- MC JURÍDICO (site da Maria Carolina Costa) — banco de dados (Supabase)
-- Cole tudo no Supabase > SQL Editor > New query e clique em RUN.
-- Pode rodar de novo sem medo: ele não duplica nada.
-- Depois rode também as atualizações 02 e 03, nessa ordem.
-- =====================================================================

-- ---------- TABELAS ----------

create table if not exists configuracoes (
  id int primary key default 1 check (id = 1),
  nome text default '',
  profissao text default '',
  descricao_hero text default '',
  destaques text default '',
  whatsapp text default '',
  whatsapp_exibicao text default '',
  instagram text default '',
  email text default '',
  mensagem_whatsapp text default '',
  sobre_texto text default '',
  area_atendimento text default '',
  observacoes_correspondente text default '',
  regras_pacotes text default '',
  passos text default '',
  assistente_saudacao text default '',
  aviso_legal text default '',
  rodape_credito text default '',
  seo_titulo text default '',
  seo_descricao text default '',
  logo_url text default '',
  foto_url text default '',
  cor_primaria text default '#0E1B33',
  cor_destaque text default '#A8894E',
  fonte_titulo text default 'Cormorant Garamond',
  tema_padrao text default 'claro',
  hero_layout text default 'com_foto',
  secoes jsonb default '[]'::jsonb,
  atualizado_em timestamptz default now()
);

create table if not exists categorias (
  id bigint generated always as identity primary key,
  nome text not null default '',
  descricao text default '',
  modalidade text default 'remoto',      -- remoto | presencial
  ordem int default 0,
  ativo boolean default true
);

create table if not exists servicos (
  id bigint generated always as identity primary key,
  categoria_id bigint references categorias(id) on delete set null,
  nome text not null default '',
  preco text default '',
  ordem int default 0,
  ativo boolean default true
);

create table if not exists pacotes (
  id bigint generated always as identity primary key,
  nome text not null default '',
  publico text default '',
  horas text default '',
  preco text default '',
  grupo text default 'mensal',           -- mensal | teste | correspondente
  destaque boolean default false,
  ordem int default 0,
  ativo boolean default true
);

create table if not exists formacoes (
  id bigint generated always as identity primary key,
  titulo text not null default '',
  instituicao text default '',
  ano text default '',
  ordem int default 0
);

create table if not exists documentos (
  id bigint generated always as identity primary key,
  titulo text not null default '',
  descricao text default '',
  pasta text default 'Geral',
  arquivo_url text default '',
  caminho text default '',
  publico boolean default true,
  ordem int default 0,
  criado_em timestamptz default now()
);

create table if not exists perguntas (
  id bigint generated always as identity primary key,
  pergunta text not null default '',
  resposta text default '',
  palavras_chave text default '',
  ordem int default 0,
  ativo boolean default true
);

create table if not exists solicitacoes (
  id bigint generated always as identity primary key,
  nome text default '',
  contato text default '',
  email text default '',
  servico text default '',
  mensagem text default '',
  status text default 'nova',            -- nova | em andamento | concluída
  criado_em timestamptz default now()
);

-- Quem pode entrar no painel: master (você) e admin (ela).
create table if not exists perfis (
  id bigint generated always as identity primary key,
  email text unique not null,
  nome text default '',
  papel text default 'admin',            -- master | admin
  ordem int default 0
);

create table if not exists depoimentos (
  id bigint generated always as identity primary key,
  nome text not null default '',
  cargo text default '',
  texto text default '',
  ordem int default 0,
  ativo boolean default true
);

-- Contador de visitas e cliques (sem dados pessoais).
create table if not exists cliques (
  id bigint generated always as identity primary key,
  tipo text not null,                    -- visita | whatsapp | assistente
  criado_em timestamptz default now()
);
create index if not exists cliques_tipo_data on cliques (tipo, criado_em);

-- Colunas novas (funciona mesmo se você já rodou uma versão antiga deste arquivo)
alter table configuracoes add column if not exists marca text default 'MC Jurídico';

-- ---------- FUNÇÕES DE PERMISSÃO ----------

create or replace function public.eh_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from perfis
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.eh_master() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from perfis
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and papel = 'master'
  );
$$;

grant execute on function public.eh_admin() to anon, authenticated;
grant execute on function public.eh_master() to anon, authenticated;

-- ---------- SEGURANÇA (RLS) ----------

alter table configuracoes enable row level security;
alter table categorias enable row level security;
alter table servicos enable row level security;
alter table pacotes enable row level security;
alter table formacoes enable row level security;
alter table documentos enable row level security;
alter table perguntas enable row level security;
alter table solicitacoes enable row level security;
alter table perfis enable row level security;
alter table cliques enable row level security;
alter table depoimentos enable row level security;

-- Conteúdo público: todo mundo lê, só admin/master altera.
do $$
declare t text;
begin
  foreach t in array array['configuracoes','categorias','servicos','pacotes','formacoes','perguntas','depoimentos'] loop
    execute format('drop policy if exists "leitura publica" on %I', t);
    execute format('drop policy if exists "admin altera" on %I', t);
    execute format('create policy "leitura publica" on %I for select using (true)', t);
    execute format('create policy "admin altera" on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
  end loop;
end $$;

-- Documentos: público vê só os marcados como públicos.
drop policy if exists "leitura publica" on documentos;
drop policy if exists "admin altera" on documentos;
create policy "leitura publica" on documentos for select using (publico or public.eh_admin());
create policy "admin altera" on documentos for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Solicitações: qualquer visitante envia, só admin lê.
drop policy if exists "visitante envia" on solicitacoes;
drop policy if exists "admin altera" on solicitacoes;
create policy "visitante envia" on solicitacoes for insert to anon, authenticated with check (status = 'nova');
create policy "admin altera" on solicitacoes for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Cliques: visitante registra, só admin lê.
drop policy if exists "visitante registra" on cliques;
drop policy if exists "admin ve" on cliques;
create policy "visitante registra" on cliques for insert to anon, authenticated with check (tipo in ('visita', 'whatsapp', 'assistente'));
create policy "admin ve" on cliques for select to authenticated using (public.eh_admin());

-- Perfis: admin vê a lista, só o master altera.
drop policy if exists "admin ve" on perfis;
drop policy if exists "master altera" on perfis;
create policy "admin ve" on perfis for select to authenticated using (public.eh_admin());
create policy "master altera" on perfis for all to authenticated using (public.eh_master()) with check (public.eh_master());

-- Permissões de acesso pela API
grant usage on schema public to anon, authenticated;
grant select on configuracoes, categorias, servicos, pacotes, formacoes, documentos, perguntas, depoimentos to anon;
grant insert on solicitacoes, cliques to anon;
grant all on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------- ARQUIVOS (PDFs, logo, foto) ----------

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', true)
on conflict (id) do nothing;

drop policy if exists "arquivos leitura" on storage.objects;
drop policy if exists "arquivos admin insere" on storage.objects;
drop policy if exists "arquivos admin altera" on storage.objects;
drop policy if exists "arquivos admin apaga" on storage.objects;
create policy "arquivos leitura" on storage.objects for select using (bucket_id = 'arquivos');
create policy "arquivos admin insere" on storage.objects for insert to authenticated with check (bucket_id = 'arquivos' and public.eh_admin());
create policy "arquivos admin altera" on storage.objects for update to authenticated using (bucket_id = 'arquivos' and public.eh_admin());
create policy "arquivos admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'arquivos' and public.eh_admin());

-- ---------- DADOS INICIAIS (só entram se o banco estiver vazio) ----------

insert into configuracoes (
  id, marca, nome, profissao, descricao_hero, destaques, whatsapp, whatsapp_exibicao, instagram, email,
  mensagem_whatsapp, sobre_texto, area_atendimento, observacoes_correspondente, regras_pacotes,
  passos, assistente_saudacao, aviso_legal, rodape_credito, seo_titulo, seo_descricao, secoes
) values (
  1,
  'MC Jurídico',
  'Maria Carolina Costa',
  'Assistente virtual e correspondente jurídica',
  'Apoio administrativo para escritórios de advocacia e pequenos negócios. Prazos, protocolos, documentos, PDFs, financeiro e atendimento, com organização e sigilo.',
  E'100% online para todo o Brasil\nPresencial em Três Rios e Paraíba do Sul (RJ)\nBacharel em Direito',
  '5524993270959',
  '(24) 99327-0959',
  'macarolinass',
  '',
  'Olá, Maria Carolina! Vim pelo site e gostaria de saber mais sobre os seus serviços.',
  E'Sou bacharel em Direito e trabalho como assistente virtual e correspondente jurídica.\n\nAjudo escritórios de advocacia e pequenos negócios a tirar do caminho as tarefas que tomam tempo: controle de prazos, protocolos, digitação de peças, certidões, PDFs, planilhas, financeiro e atendimento. Assim, você fica livre para o que é estratégico.\n\nAtendo 100% online para todo o Brasil e, presencialmente, em Três Rios e Paraíba do Sul (RJ), com diligências em fóruns e cartórios.',
  E'Presencial em Três Rios/RJ e Paraíba do Sul/RJ (+ deslocamento).\nOutras comarcas sob consulta.',
  'Custas e taxas repassadas.',
  E'Pagamento antecipado\nHoras não acumulam\nHora extra R$ 40\nContrato de 3 meses: 10% de desconto',
  E'Você me chama | Conte pelo WhatsApp ou pelo formulário o que precisa.\nEu envio o orçamento | Valor e prazo claros antes de começar.\nEu executo | Cuido da tarefa e mantenho você informado.\nVocê recebe | Entrega organizada, com relatório e fotos nas diligências.',
  'Olá! Sou a assistente do site da Maria Carolina. Escolha uma dúvida abaixo ou escreva sua pergunta.',
  'Serviços de apoio administrativo e diligências. Não são realizados atos privativos da advocacia.',
  'Site feito por Matheus Alcântara',
  'MC Jurídico | Maria Carolina Costa, assistente virtual e correspondente jurídica',
  'Apoio administrativo para escritórios de advocacia e pequenos negócios. Atendimento online para todo o Brasil e diligências em Três Rios e Paraíba do Sul (RJ).',
  '[{"id":"servicos","visivel":true},{"id":"correspondente","visivel":true},{"id":"pacotes","visivel":true},{"id":"como_funciona","visivel":true},{"id":"sobre","visivel":true},{"id":"documentos","visivel":true},{"id":"perguntas","visivel":true},{"id":"contato","visivel":true}]'::jsonb
) on conflict (id) do nothing;

do $$
declare c1 bigint; c2 bigint; c3 bigint; c4 bigint; c5 bigint;
begin
  if (select count(*) from categorias) = 0 then
    insert into categorias (nome, descricao, modalidade, ordem) values
      ('Suporte administrativo jurídico', 'Apoio documental e operacional para escritórios de advocacia.', 'remoto', 1) returning id into c1;
    insert into categorias (nome, descricao, modalidade, ordem) values
      ('Financeiro e comercial', 'Controles, orçamentos, pedidos e relatórios simples.', 'remoto', 3) returning id into c2;
    insert into categorias (nome, descricao, modalidade, ordem) values
      ('Digital e plataformas', 'Formulários, arquivos PDF, cadastros e ferramentas digitais.', 'remoto', 4) returning id into c3;
    insert into categorias (nome, descricao, modalidade, ordem) values
      ('Suporte a pequenos negócios', 'Gestão de pedidos, clientes, estoque e organização empresarial.', 'remoto', 5) returning id into c4;
    insert into categorias (nome, descricao, modalidade, ordem) values
      ('Correspondente jurídica (presencial)', 'Diligências presenciais para escritórios de qualquer comarca.', 'presencial', 2) returning id into c5;

    insert into servicos (categoria_id, nome, preco, ordem) values
      (c1, 'Controle de prazos e audiências', 'R$ 50/h', 1),
      (c1, 'Acompanhamento processual', 'R$ 8 a 15 /processo/mês', 2),
      (c1, 'Protocolo eletrônico de petições', 'R$ 25 a 40 cada', 3),
      (c1, 'Digitação e formatação de peças', 'R$ 8 a 15 /página', 4),
      (c1, 'Organização de documentos de clientes', 'R$ 50/h', 5),
      (c1, 'Montagem de pastas e dossiês digitais', 'R$ 60 a 150', 6),
      (c1, 'Atendimento e triagem de clientes', 'R$ 50/h', 7),
      (c1, 'Agendamento de consultas', 'R$ 50/h', 8),
      (c1, 'Emissão de certidões', 'R$ 20 a 40 cada', 9),
      (c1, 'Controle de honorários', 'desde R$ 150/mês', 10),
      (c2, 'Contas a pagar e receber', 'desde R$ 150/mês', 1),
      (c2, 'Fluxo de caixa simples', 'desde R$ 120/mês', 2),
      (c2, 'Elaboração de orçamentos', 'R$ 15 a 30 cada', 3),
      (c2, 'Emissão de notas fiscais e boletos', 'R$ 5 cada', 4),
      (c2, 'Lançamento de pedidos', 'R$ 3 a 5 cada', 5),
      (c2, 'Cobrança de inadimplentes', 'R$ 45/h', 6),
      (c2, 'Relatório mensal simples', 'R$ 80 a 150', 7),
      (c2, 'Follow-up de propostas', 'R$ 45/h', 8),
      (c3, 'Criação de formulários online', 'R$ 40 a 80', 1),
      (c3, 'Edição, junção e conversão de PDF', 'R$ 5 a 10 /arquivo', 2),
      (c3, 'PDF editável e preenchível', 'R$ 40 a 100', 3),
      (c3, 'Cadastros em sistemas e plataformas', 'R$ 3 a 8 cada', 4),
      (c3, 'Cadastro de produtos em marketplaces', 'R$ 5 a 10 cada', 5),
      (c3, 'Organização de Drive / OneDrive', 'R$ 45/h', 6),
      (c3, 'Planilhas e modelos personalizados', 'desde R$ 60', 7),
      (c3, 'Assinatura digital (envio e controle)', 'R$ 10 cada', 8),
      (c4, 'Gestão de pedidos', 'R$ 45/h', 1),
      (c4, 'Atendimento no WhatsApp e Instagram', 'R$ 45/h', 2),
      (c4, 'Cadastro e controle de clientes', 'desde R$ 100/mês', 3),
      (c4, 'Controle de estoque', 'desde R$ 150/mês', 4),
      (c4, 'Fornecedores e cotações', 'R$ 50 a 100', 5),
      (c4, 'Organização de processos e rotinas', 'R$ 150 a 400', 6),
      (c4, 'Agenda e confirmações', 'R$ 45/h', 7),
      (c5, 'Diligências em fóruns e cartórios', 'R$ 60 a 120', 1),
      (c5, 'Protocolo físico de petições', 'R$ 50 a 80', 2),
      (c5, 'Extração de cópias de processos', 'R$ 50 a 100', 3),
      (c5, 'Consulta presencial de processos físicos', 'R$ 40 a 80', 4),
      (c5, 'Certidões presenciais em cartórios', 'R$ 40 a 80', 5),
      (c5, 'Pesquisa em cartório de imóveis', 'R$ 60 a 120', 6),
      (c5, 'Retirada e entrega de documentos', 'R$ 50 a 100', 7),
      (c5, 'Preposto em audiências', 'R$ 150 a 250', 8),
      (c5, 'Relatório com fotos da diligência', 'incluso', 9);
  end if;

  if (select count(*) from pacotes) = 0 then
    insert into pacotes (nome, publico, horas, preco, grupo, destaque, ordem) values
      ('Start', 'Autônomos', '10h/mês', 'R$ 450', 'mensal', false, 1),
      ('Essencial', 'Pequenos negócios', '20h/mês', 'R$ 850', 'mensal', false, 2),
      ('Jurídico', 'Advogados e escritórios', '30h/mês', 'R$ 1.300', 'mensal', true, 3),
      ('Empresarial', 'Volume constante', '40h/mês', 'R$ 1.600', 'mensal', false, 4),
      ('Dedicado', 'Empresas maiores', '80h/mês', 'R$ 3.000', 'mensal', false, 5),
      ('Pacote teste', 'Experimente antes de fechar um plano', '5 horas', 'R$ 200', 'teste', false, 6),
      ('Pacote Correspondente', 'Até 8 diligências por mês, com relatório de cada uma', 'até 8 diligências/mês', 'R$ 600', 'correspondente', true, 7);
  end if;

  if (select count(*) from formacoes) = 0 then
    insert into formacoes (titulo, instituicao, ano, ordem) values
      ('Bacharel em Direito', '', '', 1);
  end if;

  if (select count(*) from perguntas) = 0 then
    insert into perguntas (pergunta, resposta, palavras_chave, ordem) values
      ('Como funciona o atendimento?', 'O atendimento é 100% online para todo o Brasil, pelo WhatsApp e por e-mail. Diligências presenciais são feitas em Três Rios e Paraíba do Sul (RJ).', 'atendimento online remoto funciona como', 1),
      ('Quais são os valores?', 'A hora avulsa fica entre R$ 40 e R$ 60. Os pacotes mensais começam em R$ 450, e existe um pacote teste de 5 horas por R$ 200. Os valores de cada serviço estão na seção Serviços.', 'valor preco quanto custa custo pacote hora tabela', 2),
      ('Você é advogada?', 'Sou bacharel em Direito e presto serviços de apoio administrativo e diligências. Não realizo atos privativos da advocacia, como assinar petições ou dar consultoria jurídica.', 'advogada oab advogado consultoria peticao', 3),
      ('Quais cidades você atende presencialmente?', 'Três Rios/RJ. Em Paraíba do Sul/RJ, soma-se o custo de deslocamento. Outras comarcas sob consulta.', 'cidade presencial diligencia comarca tres rios paraiba do sul forum cartorio', 4),
      ('Como contrato um pacote?', 'É só chamar no WhatsApp. Combinamos o pacote ideal, e o pagamento é antecipado. Contratos de 3 meses têm 10% de desconto.', 'contratar contrato pacote pagamento plano mensal', 5),
      ('Recebo comprovante das diligências?', 'Sim. Cada diligência vem com relatório e fotos, incluso no valor.', 'relatorio comprovante foto diligencia', 6),
      ('Vocês trabalham com PDF e formulários?', 'Sim: edição, junção e conversão de PDF, PDFs editáveis e preenchíveis, formulários online e planilhas personalizadas.', 'pdf formulario planilha documento preencher editavel', 7);
  end if;
end $$;

-- ---------- ACESSO AO PAINEL ----------
-- E-mails liberados no painel (troque aqui se precisar).
-- Depois crie as contas com esses mesmos e-mails em Authentication > Users > Add user.
insert into perfis (email, nome, papel) values
  ('matheusalcan19@gmail.com', 'Matheus', 'master'),
  ('vitraforma@gmail.com', 'Maria Carolina', 'admin')
on conflict (email) do nothing;
