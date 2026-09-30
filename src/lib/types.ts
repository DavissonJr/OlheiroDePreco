import type { PlanoId } from "./planos";

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
  ml_nickname: string | null;
  telegram_conectado: boolean;
  alerta_email: boolean;
  alerta_telegram: boolean;
  onboarding_ok: boolean;
}

export interface Produto {
  id: string;
  titulo: string;
  preco: number;
  thumbnail: string | null;
  permalink: string | null;
  estoque: number | null;
}

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
  titulo: string;
  vendedor: string | null;
  thumbnail: string | null;
  permalink: string | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  ultima_verificacao: string | null;
  created_at: string;
}

export interface PontoPreco {
  preco: number;
  registrado_em: string;
}

export type TipoAlerta = "queda" | "abaixo_do_meu" | "subiu";

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
