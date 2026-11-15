-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 11 (Fase 1)
-- Mensagens novas do WhatsApp, emojis por área, checklist de documentos,
-- simulador, nota média, respostas prontas, recibo/comprovante e despesas.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Colunas novas ----------
alter table categorias add column if not exists emoji text default '';
alter table servicos add column if not exists checklist text default '';
alter table atendimentos add column if not exists checklist_feito jsonb default '[]'::jsonb;
alter table atendimentos add column if not exists comprovante text;
alter table configuracoes add column if not exists mostrar_nota boolean default true;
alter table configuracoes add column if not exists hora_avulsa numeric(10, 2) default 50;
alter table configuracoes add column if not exists hora_extra numeric(10, 2) default 40;

-- ---------- Emojis das áreas ----------
update categorias set emoji = '⚖️' where coalesce(emoji, '') = '' and nome ilike 'Suporte administrativo%';
update categorias set emoji = '💼' where coalesce(emoji, '') = '' and modalidade = 'presencial';
update categorias set emoji = '💰' where coalesce(emoji, '') = '' and nome ilike 'Financeiro%';
update categorias set emoji = '💻' where coalesce(emoji, '') = '' and nome ilike 'Digital%';
update categorias set emoji = '🏪' where coalesce(emoji, '') = '' and nome ilike 'Suporte a pequenos%';

-- ---------- Checklist de documentos (só preenche onde estiver vazio) ----------
update servicos set checklist = E'Petição em PDF (assinada)\nProcuração\nGuia de custas paga, se houver\nDocumentos que acompanham a petição' where coalesce(checklist, '') = '' and nome ilike 'Protocolo%';
update servicos set checklist = E'Número do processo\nO que deve ser feito no local\nSubstabelecimento ou autorização, se necessário' where coalesce(checklist, '') = '' and nome ilike 'Diligências em fóruns%';
update servicos set checklist = E'Número do processo\nVara / comarca\nQuais peças ou páginas copiar' where coalesce(checklist, '') = '' and (nome ilike 'Extração de cópias%' or nome ilike 'Consulta presencial%');
update servicos set checklist = E'Nome completo e CPF/CNPJ\nTipo de certidão\nComarca ou cartório' where coalesce(checklist, '') = '' and (nome ilike 'Emissão de certidões%' or nome ilike 'Certidões presenciais%');
update servicos set checklist = E'Matrícula ou endereço do imóvel\nNome do proprietário\nCartório de registro (se souber)' where coalesce(checklist, '') = '' and nome ilike 'Pesquisa em cartório de imóveis%';
update servicos set checklist = E'Carta de preposição assinada\nData, hora e local/link da audiência\nResumo do caso e limites para acordo\nDocumento com foto' where coalesce(checklist, '') = '' and nome ilike 'Preposto%';
update servicos set checklist = E'Endereço de retirada e de entrega\nNome de quem entrega e de quem recebe\nPrazo' where coalesce(checklist, '') = '' and nome ilike 'Retirada e entrega%';
update servicos set checklist = E'Modelo ou rascunho da peça\nDados das partes\nPrazo de entrega' where coalesce(checklist, '') = '' and nome ilike 'Digitação%';
update servicos set checklist = E'Arquivos em PDF\nO que fazer (juntar, dividir, converter, comprimir)\nOrdem das páginas' where coalesce(checklist, '') = '' and nome ilike 'Edição, junção%';
update servicos set checklist = E'Lista de processos (número e vara)\nAcesso aos sistemas, se for o caso\nE-mail para os avisos' where coalesce(checklist, '') = '' and (nome ilike 'Acompanhamento processual%' or nome ilike 'Controle de prazos%');

-- ---------- Mensagens do WhatsApp no novo formato ----------
update configuracoes set
  mensagem_whatsapp = E'Olá, Maria Carolina! 👋\nVim através do seu site e gostaria de saber mais sobre os seus serviços. ⚖️\n\nPoderia me ajudar? 😊',
  mensagem_servico = E'Olá, Maria Carolina! 👋\nVim através do seu site e me interessei por este serviço:\n\n{emoji} *{servico}*\n• Área: {area}\n• Valor de referência: {preco}\n\nPoderia me passar mais informações e dar sequência ao atendimento? 😊',
  mensagem_pacote = E'Olá, Maria Carolina! 👋\nVim através do seu site e me interessei por este pacote:\n\n{emoji} *{pacote}*\n• Indicado para: {publico}\n• Inclui: {horas}\n• Valor: {preco}\n\nPoderia me explicar como funciona a contratação? 😊',
  mensagem_cobranca = E'Olá{responsavel}! Tudo bem? 😊\n\nPassando para lembrar do pagamento referente a:\n\n🧾 *{servico}*\n• Data: {data}\n• Valor: *{valor}*\n\nSe já tiver feito, pode desconsiderar esta mensagem. 🙏\nObrigada!',
  credito_mensagem = E'Olá, Matheus! 👋\n\nVi o site da *MC Jurídico* (Maria Carolina Costa) e gostei muito. 💻\n\nTenho interesse em criar um site assim também. Podemos conversar? 😊'
where id = 1;

-- ---------- Despesas (privado) ----------
create table if not exists despesas (
  id bigint generated always as identity primary key,
  data date not null default current_date,
  descricao text default '',
  categoria text default 'Outros',
  valor numeric(12, 2) default 0,
  cliente_id bigint references clientes(id) on delete set null,
  repassar boolean default false,
  comprovante text,
  criado_em timestamptz default now()
);
create index if not exists despesas_data on despesas (data);

-- ---------- Respostas prontas (privado) ----------
create table if not exists respostas (
  id bigint generated always as identity primary key,
  titulo text not null default '',
  texto text default '',
  ordem int default 0,
  ativo boolean default true
);

do $$
declare t text;
begin
  foreach t in array array['despesas', 'respostas'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "admin altera" on %I', t);
    execute format('create policy "admin altera" on %I for all to authenticated using (public.eh_admin()) with check (public.eh_admin())', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant all on %I to authenticated', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to authenticated;

-- Respostas iniciais (só se a tabela estiver vazia)
do $$
begin
  if (select count(*) from respostas) = 0 then
    insert into respostas (titulo, texto, ordem) values
      ('👋 Boas-vindas', E'Olá, {nome}! 👋\nAqui é a Maria Carolina. Obrigada pelo contato! 😊\n\nMe conta com calma o que você precisa que eu já te passo as informações e o orçamento.', 1),
      ('📋 Orçamento enviado', E'Olá, {nome}! 👋\n\nAcabei de te enviar o orçamento. 📋\n• Valores e prazos estão no PDF\n• Pagamento antecipado, por Pix\n\nQualquer dúvida, é só me chamar! 😊', 2),
      ('📂 Pedido de documentos', E'Olá, {nome}! 👋\n\nPara dar andamento, preciso que me envie: 📂\n☐ \n☐ \n\nPode mandar por aqui mesmo. Obrigada! 😊', 3),
      ('⏳ Em andamento', E'Olá, {nome}! 👋\n\nSeu serviço está *em andamento*. ⏳\nAssim que concluir, te aviso por aqui. 😊', 4),
      ('💼 Diligência realizada', E'Olá, {nome}! 👋\n\nA diligência foi realizada com sucesso. ✅\nEm instantes te envio o relatório com fotos em PDF. 📎', 5),
      ('✅ Serviço concluído', E'Olá, {nome}! 👋\n\nSeu serviço foi *concluído*! ✅\nQualquer ajuste, é só me falar. Foi um prazer ajudar! 🙏', 6),
      ('💰 Dados para pagamento', E'Olá, {nome}! 👋\n\nSeguem os dados para pagamento: 💰\n• Pix: \n• Nome: Maria Carolina Costa\n\nAssim que receber, te envio o recibo. 🧾', 7),
      ('🙏 Agradecimento', E'Olá, {nome}! 👋\n\nMuito obrigada pela confiança no meu trabalho! 🙏\nQuando precisar, é só chamar. 😊', 8),
      ('🌙 Fora do horário', E'Olá, {nome}! 👋\n\nRecebi sua mensagem! 📩\nNo momento estou fora do horário de atendimento, mas te respondo no próximo dia útil logo cedo. 😊', 9),
      ('🌐 Enviar o site', E'Olá, {nome}! 👋\n\nNo meu site você encontra todos os serviços, valores e pacotes: 🌐\n👉 {site}\n\nQualquer dúvida, estou à disposição! 😊', 10);
  end if;
end $$;
