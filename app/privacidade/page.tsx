// Política de privacidade (LGPD). O texto usa os dados do painel automaticamente.
import type { Metadata } from 'next';
import Link from 'next/link';
import { carregarDados } from '@/lib/dados';
import PaginaSimples from '@/components/site/PaginaSimples';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Política de privacidade' };

export default async function Privacidade() {
  const d = await carregarDados();
  if (!d) return null;
  const c = d.config;
  const contato = [c.email, c.whatsapp_exibicao && `WhatsApp ${c.whatsapp_exibicao}`].filter(Boolean).join(' ou ');

  return (
    <PaginaSimples config={c}>
      <main className="conteiner texto-legal">
        <p><Link href="/">← Voltar ao site</Link></p>
        <h1>Política de privacidade</h1>
        <p className="nota">Última atualização: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>

        <h2>Quem cuida dos seus dados</h2>
        <p>Este site é de {c.nome} ({c.marca}), responsável pelo tratamento dos dados pessoais coletados aqui, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Contato: {contato}.</p>

        <h2>Quais dados são coletados</h2>
        <p>Quando você envia o formulário “Solicite um serviço”, guardamos o nome, o WhatsApp, o e-mail (se informado), o serviço escolhido e a mensagem. O site também conta, sem identificar ninguém, quantas visitas recebe e quantas vezes os botões do WhatsApp e do assistente são usados. Nenhum dado de navegação é vendido ou usado para anúncios.</p>

        <h2>Para que eles servem</h2>
        <p>Os dados do formulário servem apenas para responder ao seu pedido, enviar orçamento e prestar o serviço contratado. A base legal é o procedimento preliminar ao contrato que você solicitou (art. 7º, V, da LGPD).</p>

        <h2>Onde ficam e por quanto tempo</h2>
        <p>Os dados ficam armazenados em servidores do Supabase, com acesso restrito por senha. As solicitações são mantidas enquanto forem necessárias para o atendimento e excluídas quando não houver mais finalidade ou quando você pedir.</p>

        <h2>Conversas pelo WhatsApp</h2>
        <p>Ao clicar em um botão do WhatsApp, você sai deste site e passa a usar o aplicativo do WhatsApp, que tem a própria política de privacidade.</p>

        <h2>Sigilo</h2>
        <p>Documentos e informações recebidos para a prestação dos serviços são tratados com sigilo e usados somente para a finalidade combinada.</p>

        <h2>Seus direitos</h2>
        <p>Você pode pedir a qualquer momento a confirmação, o acesso, a correção ou a exclusão dos seus dados, entre outros direitos do art. 18 da LGPD. Basta entrar em contato pelos canais acima.</p>

        <p className="nota" style={{ marginTop: 40 }}>{c.aviso_legal}</p>
      </main>
    </PaginaSimples>
  );
}
