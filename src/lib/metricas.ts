import type { Venda } from "./types";

export type Periodo = 7 | 30 | 90;

const DIA = 86400000;

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function vendasNoPeriodo(vendas: Venda[], dias: number, deslocamento = 0) {
  const fim = inicioDoDia(new Date()).getTime() + DIA - deslocamento * dias * DIA;
  const inicio = fim - dias * DIA;
  return vendas.filter((v) => {
    const t = new Date(v.data).getTime();
    return t >= inicio && t < fim && v.status !== "cancelled";
  });
}

export function resumo(vendas: Venda[]) {
  const faturamento = vendas.reduce((s, v) => s + v.total, 0);
  const taxas = vendas.reduce((s, v) => s + v.taxa, 0);
  const pedidos = vendas.length;
  const unidades = vendas.reduce((s, v) => s + v.itens.reduce((a, i) => a + i.quantidade, 0), 0);
  return {
    faturamento,
    taxas,
    liquido: faturamento - taxas,
    pedidos,
    unidades,
    ticket: pedidos ? faturamento / pedidos : 0,
  };
}

export function variacao(atual: number, anterior: number) {
  if (!anterior) return null;
  return (atual - anterior) / anterior;
}

export function seriePorDia(vendas: Venda[], dias: number) {
  const hoje = inicioDoDia(new Date());
  const mapa = new Map<string, { faturamento: number; pedidos: number }>();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * DIA);
    mapa.set(d.toISOString().slice(0, 10), { faturamento: 0, pedidos: 0 });
  }
  for (const v of vendas) {
    if (v.status === "cancelled") continue;
    const chave = inicioDoDia(new Date(v.data)).toISOString().slice(0, 10);
    const p = mapa.get(chave);
    if (p) {
      p.faturamento += v.total;
      p.pedidos += 1;
    }
  }
  return [...mapa.entries()].map(([dia, p]) => ({ dia, ...p }));
}

export function maisVendidos(vendas: Venda[], limite = 5) {
  const mapa = new Map<string, { item_id: string; titulo: string; unidades: number; receita: number }>();
  for (const v of vendas) {
    if (v.status === "cancelled") continue;
    for (const i of v.itens) {
      const atual = mapa.get(i.item_id) ?? { item_id: i.item_id, titulo: i.titulo, unidades: 0, receita: 0 };
      atual.unidades += i.quantidade;
      atual.receita += i.quantidade * i.preco;
      mapa.set(i.item_id, atual);
    }
  }
  return [...mapa.values()].sort((a, b) => b.receita - a.receita).slice(0, limite);
}
