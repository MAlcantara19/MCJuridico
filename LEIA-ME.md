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

## Onde mexer

- Pelo painel `/admin` (sem código): textos, marca, cores, fonte, tema, logo, foto,
  ordem das seções, serviços, pacotes, PDFs, perguntas do assistente e acessos.
- Estilo geral: `app/globals.css`.
- Partes da página: `components/site/`.
- Painel: `components/admin/`.
- Banco: `supabase/banco.sql` (pode rodar de novo sem duplicar nada).
