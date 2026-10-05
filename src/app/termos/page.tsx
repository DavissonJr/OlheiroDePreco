import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/site/pagina-legal";
import { CONTATO_EMAIL, RESPONSAVEL } from "@/lib/config";
import { DIAS_BONUS_INDICACAO, DIAS_TESTE, MESES_COBRADOS_NO_ANUAL, PLANO_TESTE, PLANOS, PLANOS_PAGOS, descreverIntervalo } from "@/lib/planos";
import { reais } from "@/lib/format";

export const metadata: Metadata = { title: "Termos de Uso" };

// Modelo inicial. Revise com um advogado antes de ter clientes pagantes.
export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="5 de outubro de 2026">
      <p>
        Estes termos valem pro uso do Olheiro de Preço, serviço oferecido por <strong>{RESPONSAVEL}</strong>. Ao criar
        uma conta, você concorda com eles e com a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>O que o serviço faz</h2>
      <p>
        O Olheiro de Preço mostra um resumo das suas vendas no Mercado Livre e acompanha o preço de anúncios de
        concorrentes que você escolher, avisando quando esse preço muda. Por padrão, o serviço só lê informações e
        não altera seus anúncios, preços ou pedidos.
      </p>
      <p>
        A exceção é o <strong>ajuste automático de preço</strong> do plano {PLANOS.turbo.nome}: se você ligar esse recurso
        num anúncio, o Olheiro muda o preço dele no Mercado Livre pra acompanhar o concorrente mais barato, sempre entre
        o preço mínimo e o máximo que você definir. Você pode desligar quando quiser, e cada ajuste fica registrado e é
        avisado a você. Os limites são sua responsabilidade: confira se o preço mínimo cobre todos os seus custos.
      </p>

      <h2>Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros no cadastro.</li>
        <li>Você é responsável por manter sua senha em segredo e pelo que for feito na sua conta.</li>
        <li>Pra usar o painel, você autoriza o acesso à sua conta do Mercado Livre e pode revogar quando quiser.</li>
      </ul>

      <h2>Planos e pagamento</h2>
      <ul>
        <li>O plano {PLANOS.gratis.nome} é gratuito, com os limites descritos na página de preços.</li>
        <li>
          Os planos pagos ({PLANOS_PAGOS.map((p) => `${PLANOS[p].nome}, ${reais(PLANOS[p].preco)} por mês`).join("; ")}) são
          cobrados de forma recorrente pelo Mercado Pago até você cancelar. No ciclo anual, você paga o equivalente a{" "}
          {MESES_COBRADOS_NO_ANUAL} meses de uma vez e usa por 12.
        </li>
        <li>
          Cada conta pode usar uma vez o teste grátis de {DIAS_TESTE} dias do plano {PLANOS[PLANO_TESTE].nome}, sem cartão.
          Quando o teste acaba, a conta volta pro plano {PLANOS.gratis.nome} sem nenhuma cobrança.
        </li>
        <li>
          Quando alguém que você indicou pelo seu link assina um plano pago pela primeira vez, você ganha{" "}
          {DIAS_BONUS_INDICACAO} dias de {PLANOS.pro.nome}. O bônus não vale dinheiro e não pode ser transferido. Indicações
          falsas ou feitas pra si mesmo podem ser canceladas.
        </li>
        <li>
          Ao trocar de plano com a assinatura ativa, o novo plano vale na hora e o novo valor, a partir da próxima cobrança.
        </li>
        <li>
          Você pode cancelar a qualquer momento pela tela de plano ou pelo Mercado Pago. O acesso ao plano continua até o
          fim do período já pago, e não há multa.
        </li>
        <li>
          Pelo Código de Defesa do Consumidor, você pode desistir em até 7 dias após a primeira contratação e receber o
          valor de volta. É só escrever para <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
        </li>
        <li>Mudanças de preço serão avisadas com pelo menos 30 dias de antecedência e só valem no ciclo seguinte.</li>
      </ul>

      <h2>Uso permitido</h2>
      <p>
        Não é permitido usar o serviço pra violar leis ou os termos do Mercado Livre, tentar acessar dados de outras
        pessoas, sobrecarregar ou copiar o sistema, ou revender o acesso sem autorização. Contas que fizerem isso podem ser
        suspensas.
      </p>

      <h2>Limites do serviço</h2>
      <ul>
        <li>
          Os dados vêm da API do Mercado Livre. Se ela ficar fora do ar, mudar ou limitar o acesso, os números e avisos
          podem atrasar ou ficar indisponíveis.
        </li>
        <li>
          Os preços são conferidos em intervalos ({(["gratis", ...PLANOS_PAGOS] as const).map((p) => `a cada ${descreverIntervalo(PLANOS[p].intervaloHoras)} no ${PLANOS[p].nome}`).join(", ")}), então o aviso não é
          instantâneo em relação à mudança feita pelo concorrente.
        </li>
        <li>
          Os valores de taxas e de &quot;sobra&quot; são estimativas baseadas nos dados do pedido e não substituem o seu
          controle financeiro ou contábil.
        </li>
        <li>
          As decisões de preço são suas. Na medida permitida por lei, não respondemos por perdas causadas por decisões
          tomadas com base nas informações do serviço.
        </li>
      </ul>

      <h2>Encerramento</h2>
      <p>
        Você pode excluir sua conta a qualquer momento em Conta &gt; Excluir conta. Podemos encerrar o serviço avisando
        com 30 dias de antecedência e devolvendo o valor proporcional de assinaturas pagas e não usadas.
      </p>

      <h2>Relação com o Mercado Livre</h2>
      <p>
        O Olheiro de Preço é um serviço independente e não é afiliado, patrocinado ou endossado pelo Mercado Livre ou pelo
        Mercado Pago.
      </p>

      <h2>Mudanças e contato</h2>
      <p>
        Podemos atualizar estes termos. Mudanças importantes serão avisadas por e-mail ou no app antes de valer. Dúvidas:{" "}
        <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>. Fica eleito o foro do domicílio do consumidor pra resolver
        qualquer questão.
      </p>
    </PaginaLegal>
  );
}
