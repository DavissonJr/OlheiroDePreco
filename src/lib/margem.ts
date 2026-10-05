// Contas de margem usadas na sugestão de preço e no ajuste automático.
// Tudo puro (sem banco), pra rodar igual no navegador e no servidor.
import type { Concorrente, Produto, Venda } from "./types";

// Sem vendas pra estimar, usamos uma tarifa média do Mercado Livre (anúncio clássico).
export const TARIFA_PADRAO_PCT = 13;
// Quanto abaixo do concorrente a sugestão fica, por padrão.
export const DIFERENCA_PADRAO = 0.1;

export interface Custos {
  custo: number;
  impostoPct: number;
  frete: number;
  tarifaPct: number;
  custoFixo: number;
  margemMinPct: number;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

// Tarifa real das vendas desse anúncio: soma das taxas sobre o total vendido.
// Só usa pedidos com um único anúncio, onde dá pra saber de quem é a taxa.
// O valor já inclui a tarifa fixa das vendas baratas.
export function tarifaEstimada(produtoId: string, vendas: Venda[]): number | null {
  let taxas = 0;
  let total = 0;
  for (const v of vendas) {
    if (v.status === "cancelled" || v.itens.length !== 1 || v.itens[0].item_id !== produtoId) continue;
    taxas += v.taxa;
    total += v.total;
  }
  return total > 0 ? centavos((taxas / total) * 100) : null;
}

export function custosDoProduto(p: Produto, vendas: Venda[]): Custos | null {
  if (p.custo == null) return null;
  return {
    custo: p.custo,
    impostoPct: p.imposto_pct ?? 0,
    frete: p.frete ?? 0,
    tarifaPct: p.tarifa_pct ?? tarifaEstimada(p.id, vendas) ?? TARIFA_PADRAO_PCT,
    custoFixo: p.custo_fixo ?? 0,
    margemMinPct: p.margem_min_pct ?? 0,
  };
}

export function lucro(preco: number, c: Custos) {
  return centavos(preco * (1 - c.impostoPct / 100 - c.tarifaPct / 100) - c.custo - c.frete - c.custoFixo);
}

export const margemPct = (preco: number, c: Custos) => (preco > 0 ? (lucro(preco, c) / preco) * 100 : 0);

// Menor preço que ainda deixa a margem pedida. null = impossível (percentuais somam 100% ou mais).
export function precoMinimo(c: Custos, margem = c.margemMinPct) {
  const fator = 1 - c.impostoPct / 100 - c.tarifaPct / 100 - margem / 100;
  if (fator <= 0) return null;
  return Math.ceil(((c.custo + c.frete + c.custoFixo) / fator) * 100) / 100;
}

// Concorrentes sem estoque não contam: ninguém compra deles agora.
export function menorRival(lista: Concorrente[]) {
  const precos = lista.filter((c) => !c.sem_estoque && c.preco_atual != null).map((c) => c.preco_atual!);
  return precos.length ? Math.min(...precos) : null;
}

export type TipoSugestao = "baixar" | "subir" | "segurar" | "manter";

export interface SugestaoPreco {
  tipo: TipoSugestao;
  preco: number;
  lucro: number;
  margemPct: number;
  piso: number | null;
  rival: number;
}

export function sugerirPreco(meuPreco: number, rival: number | null, c: Custos | null, diferenca = DIFERENCA_PADRAO): SugestaoPreco | null {
  if (!c || rival == null) return null;
  const piso = precoMinimo(c);
  const alvo = centavos(rival - diferenca);
  const montar = (tipo: TipoSugestao, preco: number): SugestaoPreco => ({
    tipo, preco, lucro: lucro(preco, c), margemPct: margemPct(preco, c), piso, rival,
  });

  if (meuPreco < rival) {
    // Já é o mais barato: às vezes dá pra subir e continuar na frente.
    return alvo - meuPreco >= 1 ? montar("subir", alvo) : montar("manter", meuPreco);
  }
  if (piso != null && alvo < piso) return montar("segurar", piso);
  return montar("baixar", alvo);
}

// Preço que o ajuste automático deve aplicar, ou null se não precisa mudar.
export function alvoRepricing({
  atual, rival, piso, teto, diferenca, pisoCusto,
}: {
  atual: number;
  rival: number | null;
  piso: number;
  teto: number | null;
  diferenca: number;
  pisoCusto: number | null;
}) {
  if (rival == null) return null;
  const chao = Math.max(piso, pisoCusto ?? 0);
  // Sem preço máximo, o ajuste só baixa: nunca passa do preço atual.
  const limite = teto ?? atual;
  let alvo = centavos(rival - diferenca);
  // Não dá pra ficar abaixo do concorrente sem furar o piso: baixar até o piso
  // só tiraria margem sem ganhar a venda. Mantém o preço (ou sobe até o piso, se estiver abaixo).
  if (alvo < chao) return atual < chao ? centavos(chao) : null;
  alvo = Math.min(alvo, limite);
  alvo = centavos(Math.max(alvo, chao));
  return Math.abs(alvo - atual) >= 0.01 ? alvo : null;
}
