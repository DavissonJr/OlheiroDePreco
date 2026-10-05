import type { Produto } from "./types";

// O Postgres devolve numeric como texto; converte os campos usados nas contas.
export function normalizarProduto(b: Record<string, unknown>): Produto {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    ...(b as unknown as Produto),
    preco: Number(b.preco),
    custo: n(b.custo),
    imposto_pct: n(b.imposto_pct),
    frete: n(b.frete),
    tarifa_pct: n(b.tarifa_pct),
    custo_fixo: n(b.custo_fixo),
    margem_min_pct: n(b.margem_min_pct),
    buybox_preco: n(b.buybox_preco),
    repricing_piso: n(b.repricing_piso),
    repricing_teto: n(b.repricing_teto),
    repricing_diferenca: n(b.repricing_diferenca) ?? 0.1,
  };
}
