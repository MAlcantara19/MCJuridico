-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 04
-- Deixa o site igual ao PDF "Tabela de Serviços" atualizado.
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Preços (escrita igual ao PDF) ----------
update servicos set preco = 'R$ 8 a 15 /processo/mês' where nome = 'Acompanhamento processual';
update servicos set preco = 'R$ 8 a 15 /página'       where nome = 'Digitação e formatação de peças';
update servicos set preco = 'desde R$ 150/mês'        where nome = 'Controle de honorários';
update servicos set preco = 'desde R$ 150/mês'        where nome = 'Contas a pagar e receber';
update servicos set preco = 'desde R$ 120/mês'        where nome = 'Fluxo de caixa simples';
update servicos set preco = 'R$ 5 a 10 /arquivo'      where nome = 'Edição, junção e conversão de PDF';
update servicos set preco = 'desde R$ 60'             where nome = 'Planilhas e modelos personalizados';
update servicos set preco = 'desde R$ 100/mês'        where nome = 'Cadastro e controle de clientes';
update servicos set preco = 'desde R$ 150/mês'        where nome = 'Controle de estoque';

-- Conferência dos valores que já estavam certos (garante que fiquem iguais ao PDF)
update servicos set preco = 'R$ 50/h'          where nome in ('Controle de prazos e audiências', 'Organização de documentos de clientes', 'Atendimento e triagem de clientes', 'Agendamento de consultas');
update servicos set preco = 'R$ 25 a 40 cada'  where nome = 'Protocolo eletrônico de petições';
update servicos set preco = 'R$ 60 a 150'      where nome = 'Montagem de pastas e dossiês digitais';
update servicos set preco = 'R$ 20 a 40 cada'  where nome = 'Emissão de certidões';
update servicos set preco = 'R$ 60 a 120'      where nome in ('Diligências em fóruns e cartórios', 'Pesquisa em cartório de imóveis');
update servicos set preco = 'R$ 50 a 80'       where nome = 'Protocolo físico de petições';
update servicos set preco = 'R$ 50 a 100'      where nome in ('Extração de cópias de processos', 'Retirada e entrega de documentos', 'Fornecedores e cotações');
update servicos set preco = 'R$ 40 a 80'       where nome in ('Consulta presencial de processos físicos', 'Certidões presenciais em cartórios', 'Criação de formulários online');
update servicos set preco = 'R$ 150 a 250'     where nome = 'Preposto em audiências';
update servicos set preco = 'incluso'          where nome = 'Relatório com fotos da diligência';
update servicos set preco = 'R$ 15 a 30 cada'  where nome = 'Elaboração de orçamentos';
update servicos set preco = 'R$ 5 cada'        where nome = 'Emissão de notas fiscais e boletos';
update servicos set preco = 'R$ 3 a 5 cada'    where nome = 'Lançamento de pedidos';
update servicos set preco = 'R$ 45/h'          where nome in ('Cobrança de inadimplentes', 'Follow-up de propostas', 'Organização de Drive / OneDrive', 'Gestão de pedidos', 'Atendimento no WhatsApp e Instagram', 'Agenda e confirmações');
update servicos set preco = 'R$ 80 a 150'      where nome = 'Relatório mensal simples';
update servicos set preco = 'R$ 40 a 100'      where nome = 'PDF editável e preenchível';
update servicos set preco = 'R$ 3 a 8 cada'    where nome = 'Cadastros em sistemas e plataformas';
update servicos set preco = 'R$ 5 a 10 cada'   where nome = 'Cadastro de produtos em marketplaces';
update servicos set preco = 'R$ 10 cada'       where nome = 'Assinatura digital (envio e controle)';
update servicos set preco = 'R$ 150 a 400'     where nome = 'Organização de processos e rotinas';

-- ---------- Áreas (nome e ordem iguais ao PDF) ----------
update categorias set nome = 'Correspondente jurídica (presencial)' where modalidade = 'presencial';
update categorias set ordem = 1 where nome ilike 'Suporte administrativo%';
update categorias set ordem = 2 where modalidade = 'presencial';
update categorias set ordem = 3 where nome ilike 'Financeiro%';
update categorias set ordem = 4 where nome ilike 'Digital%';
update categorias set ordem = 5 where nome ilike 'Suporte a pequenos%';

-- ---------- Pacotes ----------
update pacotes set publico = 'Autônomos'               where nome = 'Start';
update pacotes set publico = 'Pequenos negócios'       where nome = 'Essencial';
update pacotes set publico = 'Advogados e escritórios' where nome = 'Jurídico';
update pacotes set publico = 'Volume constante'        where nome = 'Empresarial';
update pacotes set publico = 'Empresas maiores'        where nome = 'Dedicado';
update pacotes set destaque = (nome = 'Jurídico')      where grupo = 'mensal';
update pacotes set preco = 'R$ 450'   where nome = 'Start';
update pacotes set preco = 'R$ 850'   where nome = 'Essencial';
update pacotes set preco = 'R$ 1.300' where nome = 'Jurídico';
update pacotes set preco = 'R$ 1.600' where nome = 'Empresarial';
update pacotes set preco = 'R$ 3.000' where nome = 'Dedicado';
update pacotes set preco = 'R$ 200', horas = '5 horas' where grupo = 'teste';
update pacotes set preco = 'R$ 600', horas = 'até 8 diligências/mês' where grupo = 'correspondente';

-- ---------- Textos ----------
update configuracoes set
  regras_pacotes = E'Pagamento antecipado\nHoras não acumulam\nHora extra R$ 40\nContrato de 3 meses: 10% de desconto',
  area_atendimento = E'Presencial em Três Rios/RJ e Paraíba do Sul/RJ (+ deslocamento).\nOutras comarcas sob consulta.',
  observacoes_correspondente = 'Custas e taxas repassadas.',
  sub_servicos = 'Atendimento 100% remoto para todo o Brasil · Hora avulsa R$ 40 a R$ 60'
where id = 1;

-- Conferência: lista completa como ficou
select c.nome as area, s.nome as servico, s.preco
from servicos s left join categorias c on c.id = s.categoria_id
order by c.ordem, s.ordem;
