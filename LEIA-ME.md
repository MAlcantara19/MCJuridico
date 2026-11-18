# MC Jurídico

Site da Maria Carolina Costa (página pública) + painel de administração em `/admin`.
Next.js + Supabase + Vercel.

## Passo a passo (do zero, no Windows)

1. Extraia o zip em `C:\projetos\mcjuridico`.
2. Abra o terminal nessa pasta e rode `npm install`.
3. No Supabase, crie um projeto novo chamado `mcjuridico` (região São Paulo).
4. Abra `supabase/banco.sql`, troque os dois e-mails do final (o seu e o dela),
   cole tudo em SQL Editor > New query e clique em Run.
5. Em Authentication > Users > Add user > Create new user, crie as duas contas
   (mesmos e-mails do passo 4, com "Auto Confirm User" marcado).
6. Copie `.env.example` para `.env.local` e preencha as 3 variáveis.
7. Rode `npm run dev` e abra http://localhost:3000 (site) e http://localhost:3000/admin (painel).
8. Crie o repositório privado `mcjuridico` no GitHub, envie o código e importe na Vercel
   (nome do projeto: `mcjuridico`), colocando as 3 variáveis em Environment Variables.
9. Para o "Esqueci minha senha" funcionar: Supabase > Authentication > URL Configuration,
   coloque o link da Vercel em Site URL e adicione `https://SEU-LINK/admin` em Redirect URLs.

## Atualização 02 (telas novas)

Se o banco já estava instalado, rode `supabase/atualizacao-02.sql` no SQL Editor (cria a tabela de depoimentos).

- `/links`: página para a bio do Instagram
- `/privacidade`: política de privacidade (LGPD), ligada ao formulário e ao rodapé
- Painel > Relatório de diligência: gera PDF com fotos para mandar ao escritório
- Painel > Depoimentos: seção nova no site (aparece quando houver depoimento ativo)

## Atualização 03 (tabela igual às artes + acessos)

Rode `supabase/atualizacao-03.sql`. Ele:
- deixa títulos e subtítulos das seções editáveis (painel > Textos e contatos > Títulos das seções)
- coloca os ícones das áreas (painel > Serviços > Áreas)
- marca o pacote Jurídico como "Mais procurado" e inclui "Relatório com fotos: incluso"
- libera matheusalcan19@gmail.com (master) e vitraforma@gmail.com (admin) no painel

## Atualização 04 (tabela de serviços atualizada)

Rode `supabase/atualizacao-04.sql`. Deixa serviços, áreas, pacotes e regras iguais ao PDF "Tabela de Serviços".

## Atualização 05 (Meus arquivos + busca)

Rode `supabase/atualizacao-05.sql`.
- Painel > Meus arquivos: pasta particular (PDFs, modelos, links do Drive), com pastas, favoritos e busca. Nada aparece no site.
- Busca de serviços no site (campo na seção Serviços e lupa no menu).
- Campo de busca em todas as listas do painel e nas solicitações.

## Atualização 06 (Agenda, Clientes, Financeiro e app no celular)

Rode `supabase/atualizacao-06.sql`.
- Painel > Agenda: prazos, diligências e audiências, com atrasados em vermelho
- Painel > Clientes: ficha de cada escritório/cliente com serviços, total e a receber
- Painel > Financeiro: faturado, recebido, a receber, gráfico de 12 meses e rankings
- Solicitações > "Virar cliente": cria o cliente e o pedido em Orçamento
- Painel instalável no celular (botão "Instalar app"); o ícone usa a logo de Visual e layout

## Atualização 07 (apresentação, WhatsApp por serviço, créditos e segurança)

Rode `supabase/atualizacao-07.sql`.
- Visual e layout > Apresentação: 5 formatos, 5 molduras, ajuste da imagem, 5 efeitos e animações, com prévia
- Cada serviço e pacote abre o WhatsApp com o nome dele na mensagem (textos em Textos e contatos)
- Resumo: "O que mais levou ao WhatsApp"
- Rodapé: selos de segurança reais e "Desenvolvido por" (editável na aba Master)
- Cabeçalhos de segurança (HSTS, CSP, anti-clickjacking) em next.config.ts

## Atualização 08 (diligência completa, orçamento, cobrança, planilha e stories)

Rode `supabase/atualizacao-08.sql` (depois do 06 e do 07).
- Relatório > Concluir diligência: salva o relatório com fotos na ficha do cliente e lança o serviço no Financeiro
- Cliente > Gerar orçamento: marca serviços da tabela, gera PDF e envia resumo no WhatsApp
- Botão "Cobrar no WhatsApp" nos serviços a receber (mensagem editável em Textos e contatos)
- Financeiro > Baixar planilha (abre no Excel)
- /story: telas verticais para postar no Instagram
- Master: contador de cliques no "Quero um site assim"

## Atualização 09 (avaliações e lembrete diário)

1. Rode `supabase/atualizacao-09.sql`.
2. Avaliações: na ficha do cliente, botão "Pedir avaliação". A avaliação chega desativada em Depoimentos; marque "Aparece no site" para publicar.
3. (O lembrete diário por e-mail foi retirado na atualização 12.)
   Antes era assim, para referência:
   - Crie conta em resend.com com o e-mail que vai receber os lembretes e gere uma API Key.
   - Na Vercel > Settings > Environment Variables, adicione SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LEMBRETE_EMAIL e CRON_SECRET (veja .env.example) e faça Redeploy.
   - Teste em Painel > Master > "Enviar e-mail de teste agora".
   - O envio automático é todo dia entre 18h e 19h (horário de Brasília), pelo vercel.json.

## Atualização 10 (pedido automático de avaliação e resumo semanal)

Rode `supabase/atualizacao-10.sql`.
- Financeiro: ao marcar um serviço como pago, o painel sugere pedir avaliação (no máximo 1 vez a cada 90 dias por cliente)
- Lembrete: às segundas, o e-mail traz o resumo da semana anterior (faturado, recebido, serviços, clientes novos, visitas, cliques e avaliações)

## Atualização 11 (Fase 1)

Rode `supabase/atualizacao-11.sql`.
- Todas as mensagens de WhatsApp no novo formato (saudação, item em negrito com emoji, tópicos e fechamento). Ficam em `lib/mensagens.ts`; as do site também em Textos e contatos
- Site: "Qual serviço eu preciso?", simulador de pacote, nota média no topo, checklist no formulário
- Painel: Respostas prontas, checklist e aviso automático no serviço, comprovante e recibo em PDF, despesas e lucro no Financeiro

## Atualização 12

- Retirado o lembrete diário por e-mail (Resend). Apague `app/api/lembrete` e `vercel.json`, e remova na Vercel as variáveis SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LEMBRETE_EMAIL e CRON_SECRET.
- Links do WhatsApp agora usam api.whatsapp.com, para os emojis chegarem certos no WhatsApp do computador.

## Atualização 13

Rode `supabase/atualizacao-13.sql`.
- Faixa de lembrete no topo do painel (atrasados, hoje, amanhã)
- Agenda > "Ver esta agenda no celular": link de calendário para Google Agenda / iPhone
- Textos e contatos: prévia das mensagens no estilo WhatsApp e botão "Testar no meu WhatsApp"
- Pix copia e cola (Textos e contatos > Pix) na cobrança, no orçamento (com QR Code) e em {pix} nas respostas prontas
- Guia: pessoa física recebe o pacote teste; resultado com 3 serviços e "ver mais"
- Master: Baixar backup (.json)
- Visual e layout: temas prontos (Clássico, Moderno, Minimalista)

## Atualização 15 (Fase 2)

Rode `supabase/atualizacao-15.sql` e depois `npm install` (Next.js 16.4.6, que corrige uma falha de segurança, e o pacote do Excel).
- Pedidos com código (MC-0001…), etapa "Aguardando documentos", prazo e observações internas (texto, ditado e áudio)
- Área do cliente: /cliente/<link> com código de 4 dígitos (Clientes > ficha > Área do cliente)
- Cliente envia documentos e comprovante; o pedido fica "Pago, a conferir"
- "Só o Pix" na cobrança · etiquetas com filtro · horas do pacote com cronômetro
- Tabela de clientes colorida (imprimir e Excel) · relatório mensal em PDF
- Agenda com cores por tipo · tema Noturno · restaurar backup e duplicar site (veja NOVO-SITE.md)
- Página /escritorios para advogados de outras cidades
- WhatsApp: no computador abre pelo WhatsApp Web (mantém os emojis); no celular, pelo app

## Onde mexer

- Pelo painel `/admin` (sem código): textos, marca, cores, fonte, tema, logo, foto,
  ordem das seções, serviços, pacotes, PDFs, perguntas do assistente e acessos.
- Estilo geral: `app/globals.css`.
- Partes da página: `components/site/`.
- Painel: `components/admin/`.
- Banco: `supabase/banco.sql` (pode rodar de novo sem duplicar nada).
