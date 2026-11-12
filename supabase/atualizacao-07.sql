-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 07
-- Formatos da apresentação, efeitos, mensagens por serviço/pacote,
-- crédito do desenvolvedor e estatística do que leva ao WhatsApp.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

alter table configuracoes add column if not exists hero_moldura text default 'quadrado';
alter table configuracoes add column if not exists hero_ajuste text default 'cobrir';
alter table configuracoes add column if not exists hero_efeito text default 'brilho';
alter table configuracoes add column if not exists animacoes boolean default true;
alter table configuracoes add column if not exists mensagem_servico text default 'Olá, Maria Carolina! Vim pelo site e tenho interesse no serviço *{servico}* ({area}), valor de referência {preco}. Pode me passar mais detalhes?';
alter table configuracoes add column if not exists mensagem_pacote text default 'Olá, Maria Carolina! Vim pelo site e tenho interesse no *{pacote}* ({horas}, {preco}). Como faço para contratar?';
alter table configuracoes add column if not exists credito_nome text default 'Matheus Alcântara';
alter table configuracoes add column if not exists credito_whatsapp text default '5524992924519';
alter table configuracoes add column if not exists credito_instagram text default 'm_alcantara19';
alter table configuracoes add column if not exists credito_mensagem text default 'Olá, Matheus! Vi o site da MC Jurídico (Maria Carolina Costa) e tenho interesse em criar um site assim também.';

-- Tira o "arco" (que parecia lápide) e usa o quadrado com contorno
update configuracoes set hero_moldura = 'quadrado' where id = 1 and (hero_moldura is null or hero_moldura = 'arco');

-- O crédito antigo agora fica na área "Desenvolvido por"
update configuracoes set rodape_credito = '' where id = 1;

-- Qual serviço/pacote/botão levou ao WhatsApp
alter table cliques add column if not exists detalhe text;
