import type { Metadata } from "next";
import { PaginaLegal } from "@/components/site/pagina-legal";
import { CONTATO_EMAIL, RESPONSAVEL } from "@/lib/config";

export const metadata: Metadata = { title: "Política de Privacidade" };

// Modelo inicial pensado pra LGPD. Revise com um advogado antes de ter clientes pagantes.
export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="30 de setembro de 2026">
      <p>
        Esta política explica quais dados o Olheiro de Preço coleta, pra que usa, com quem compartilha e como você
        controla suas informações, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h2>Quem cuida dos seus dados</h2>
      <p>
        O controlador dos dados é <strong>{RESPONSAVEL}</strong>. Pra qualquer assunto sobre privacidade, escreva para{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (guardada de forma criptografada; nós não conseguimos lê-la).</li>
        <li>
          <strong>Mercado Livre, com a sua autorização:</strong> apelido da conta, anúncios ativos (título, preço, estoque
          e foto) e pedidos dos últimos 90 dias (data, valor, taxas, itens e status). Não recebemos seus dados bancários
          nem dados pessoais dos seus compradores além do que vem no pedido.
        </li>
        <li><strong>Concorrentes que você cadastra:</strong> links, títulos, vendedores e o histórico de preços desses anúncios públicos.</li>
        <li><strong>Telegram, se você conectar:</strong> o identificador da conversa com o nosso bot, pra enviar os avisos.</li>
        <li>
          <strong>Pagamento:</strong> a assinatura é processada pelo Mercado Pago. Guardamos só o identificador e o status
          da assinatura. Nunca recebemos os dados do seu cartão.
        </li>
        <li><strong>Dados técnicos:</strong> registros de acesso (endereço IP, data e hora), exigidos pelo Marco Civil da Internet.</li>
      </ul>

      <h2>Pra que usamos</h2>
      <ul>
        <li>Montar o seu painel de vendas e comparar seus preços com os dos concorrentes.</li>
        <li>Enviar avisos de mudança de preço pelos canais que você escolheu.</li>
        <li>Cobrar e administrar a assinatura do plano Pro.</li>
        <li>Manter o serviço seguro, corrigir erros e cumprir obrigações legais.</li>
      </ul>
      <p>
        A base legal é a execução do contrato com você (art. 7º, V), o cumprimento de obrigação legal (art. 7º, II) e,
        pra segurança e melhoria do serviço, o legítimo interesse (art. 7º, IX). Não vendemos seus dados e não usamos
        seus dados pra publicidade.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>Só com os fornecedores necessários pra o serviço funcionar, cada um tratando os dados em nosso nome:</p>
      <ul>
        <li>Supabase (banco de dados e login)</li>
        <li>Empresa de hospedagem do site</li>
        <li>Mercado Livre (consulta dos seus pedidos, anúncios e preços)</li>
        <li>Mercado Pago (cobrança da assinatura)</li>
        <li>Telegram e o serviço de envio de e-mails (entrega dos avisos)</li>
      </ul>
      <p>
        Alguns desses fornecedores guardam dados em servidores fora do Brasil. Nesses casos, a transferência segue o que
        a LGPD permite, com fornecedores que adotam padrões de proteção adequados.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>Pedidos e histórico de preços: até 90 dias.</li>
        <li>Dados da conta: enquanto ela existir. Quando você exclui a conta, apagamos tudo em seguida.</li>
        <li>Registros de acesso: 6 meses, como exige o Marco Civil da Internet.</li>
      </ul>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, portabilidade, informação
        sobre compartilhamento e exclusão. A exclusão pode ser feita direto no app, em <strong>Conta &gt; Excluir conta</strong>.
        Você também pode revogar o acesso do Olheiro de Preço nas configurações de segurança da sua conta do Mercado Livre.
        Pros demais pedidos, escreva para <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>. Respondemos em até 15 dias.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos apenas cookies essenciais, que mantêm você conectado. Não usamos cookies de publicidade nem de rastreamento
        de terceiros.
      </p>

      <h2>Segurança</h2>
      <p>
        As conexões são criptografadas (HTTPS), cada conta só enxerga os próprios dados e as chaves de acesso ao Mercado
        Livre ficam guardadas apenas no servidor. Se acontecer algum incidente que possa te afetar, avisaremos você e a
        Autoridade Nacional de Proteção de Dados.
      </p>

      <h2>Mudanças nesta política</h2>
      <p>Se mudarmos algo importante, avisaremos por e-mail ou dentro do app antes da mudança valer.</p>
    </PaginaLegal>
  );
}
