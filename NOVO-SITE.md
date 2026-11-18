# Duplicar este site para outro profissional

Use quando for montar o site de outro correspondente, contador, despachante etc. a partir deste.

1. **No painel deste site** › Master › "Duplicar site" › **Baixar modelo do site** (arquivo `modelo-mcjuridico-AAAA-MM-DD.json`, sem dados de clientes).
   Para vender o site a outra pessoa, use **Baixar modelo genérico (limpo)**: troca nome, marca, WhatsApp, Instagram, e-mail, Pix, logo, foto e assinatura por campos a preencher e não leva as comarcas.
2. **Código:** copie a pasta `C:\projetos\mcjuridico` para `C:\projetos\NOME-DO-NOVO`, apague a pasta `.git` da cópia e rode:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão"
   ```
   Crie um repositório novo no GitHub e envie (`git remote add origin ...` e `git push -u origin main`).
3. **Supabase:** o ideal é a conta ser **do cliente** (cada pessoa tem 2 projetos grátis). Crie o projeto (região São Paulo) e rode, nesta ordem: `banco.sql` (troque os e-mails do final) e as atualizações `02` a `16` (não existem 12 e 14).
4. **Contas do painel:** em Authentication › Users, crie as contas com os mesmos e-mails do passo 3.
5. **Vercel:** importe o repositório novo e cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`.
6. **No painel do site novo** › Master › **Importar modelo** e escolha o arquivo do passo 1. Os textos, cores, serviços e pacotes chegam iguais.
7. Ajuste o que muda: nome, marca, WhatsApp, Instagram, Pix, logo e foto (Textos e contatos / Visual e layout), serviços e preços.
8. No código, abra `lib/mensagens.ts` e troque a linha `export const CONTATO = 'Maria Carolina';` pelo nome do novo profissional (é o nome que aparece nas mensagens de WhatsApp).
9. Em Comarcas (mapa), cadastre as cidades atendidas e use "📍 Achar no mapa".
10. Na aba Master, confira o crédito "Desenvolvido por" com os seus dados.

Dica: revise as perguntas do assistente e os textos de "Sobre", que podem citar cidades do site original.
