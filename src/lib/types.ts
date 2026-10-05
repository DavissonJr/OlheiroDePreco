import type { Ciclo, PlanoId } from "./planos";

export type Marketplace = "mercadolivre" | "shopee" | "amazon" | "magalu" | "aliexpress";

export const MARKETPLACES: { id: Marketplace; nome: string; disponivel: boolean; cor: string }[] = [
  { id: "mercadolivre", nome: "Mercado Livre", disponivel: true, cor: "#ffe14d" },
  { id: "shopee", nome: "Shopee", disponivel: false, cor: "#f5603a" },
  { id: "amazon", nome: "Amazon", disponivel: false, cor: "#232f3e" },
  { id: "magalu", nome: "Magalu", disponivel: false, cor: "#0086ff" },
  { id: "aliexpress", nome: "AliExpress", disponivel: false, cor: "#e62e04" },
];

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  marketplaces: Marketplace[];
  plano: PlanoId;
  // Até quando o plano pago vale depois de um cancelamento (fim do período pago).
  pro_ate: string | null;
  assinatura_ativa: boolean;
  assinatura_plano: PlanoId | null;
  assinatura_ciclo: Ciclo | null;
  // Teste grátis e bônus de indicação
  teste_usado: boolean;
  cortesia_ate: string | null;
  codigo_indicacao: string | null;
  indicacoes_ok: number;
  ml_nickname: string | null;
  telegram_conectado: boolean;
  alerta_email: boolean;
  alerta_telegram: boolean;
  email_frequencia: "na_hora" | "diario";
  resumo_semanal: boolean;
  interesse_whatsapp: boolean;
  onboarding_ok: boolean;
}

export interface Produto {
  id: string;
  titulo: string;
  preco: number;
  thumbnail: string | null;
  permalink: string | null;
  estoque: number | null;
  // Custos pra sugestão de preço (vazio = não informado)
  custo: number | null;
  imposto_pct: number | null;
  frete: number | null;
  tarifa_pct: number | null;
  custo_fixo: number | null;
  margem_min_pct: number | null;
  // Catálogo / compra rápida
  catalogo_id: string | null;
  buybox_ganhando: boolean | null;
  buybox_vencedor: string | null;
  buybox_preco: number | null;
  buybox_verificado_em: string | null;
  // Ajuste automático de preço
  repricing_ativo: boolean;
  repricing_piso: number | null;
  repricing_teto: number | null;
  repricing_diferenca: number;
  repricing_ultimo_em: string | null;
}

export type CamposCusto = "custo" | "imposto_pct" | "frete" | "tarifa_pct" | "custo_fixo" | "margem_min_pct";
export type CamposRepricing = "repricing_ativo" | "repricing_piso" | "repricing_teto" | "repricing_diferenca";

export interface ItemVenda {
  item_id: string;
  titulo: string;
  quantidade: number;
  preco: number;
}

export interface Venda {
  id: string;
  data: string;
  total: number;
  taxa: number;
  status: string;
  itens: ItemVenda[];
}

export interface Concorrente {
  id: string;
  meu_item_id: string | null;
  item_id: string;
  // Produto de catálogo: é por ele que o preço é lido (veja vendedoresCatalogo em lib/ml.ts)
  catalogo_id: string | null;
  titulo: string;
  vendedor: string | null;
  thumbnail: string | null;
  permalink: string | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  ultima_verificacao: string | null;
  created_at: string;
  estoque: number | null;
  sem_estoque: boolean;
  // Regras de aviso (vazio = avisa toda mudança)
  regra_queda_pct: number | null;
  regra_abaixo_de: number | null;
  regra_so_abaixo_do_meu: boolean;
}

export type CamposRegra = "regra_queda_pct" | "regra_abaixo_de" | "regra_so_abaixo_do_meu";

// De onde veio a sugestão de concorrente
export type OrigemSugestao = "mesmo_produto" | "parecido" | "mais_vendido";

export interface Sugestao {
  item_id: string;
  catalogo_id: string;
  titulo: string;
  preco: number;
  vendedor: string | null;
  thumbnail: string | null;
  permalink: string | null;
  origem: OrigemSugestao;
}

export interface AjustePreco {
  id: number;
  produto_id: string;
  preco_antigo: number;
  preco_novo: number;
  motivo: string;
  created_at: string;
}

export interface PontoPreco {
  preco: number;
  registrado_em: string;
}

export type TipoAlerta =
  | "queda"
  | "abaixo_do_meu"
  | "subiu"
  | "sem_estoque"
  | "voltou_estoque"
  | "buybox_perdida"
  | "buybox_ganha"
  | "ajuste_preco";

export interface Alerta {
  id: string;
  concorrente_id: string | null;
  tipo: TipoAlerta;
  mensagem: string;
  preco_antigo: number | null;
  preco_novo: number | null;
  lido: boolean;
  created_at: string;
}
