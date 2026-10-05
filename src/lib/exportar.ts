// Exportação pra planilha. CSV com ";" e vírgula decimal, que é o que o
// Excel em português abre direto, com acentos (por causa do BOM no início).
import type { Concorrente, PontoPreco, Produto, Venda } from "./types";

type Celula = string | number | null | undefined;

function celula(v: Celula) {
  if (v == null) return "";
  const s = typeof v === "number" ? String(v).replace(".", ",") : v;
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function baixar(nome: string, linhas: Celula[][]) {
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const hoje = () => new Date().toISOString().slice(0, 10);
const dataBr = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export function exportarVendas(vendas: Venda[]) {
  baixar(`olheiro-vendas-${hoje()}.csv`, [
    ["Data", "Pedido", "Status", "Itens", "Total (R$)", "Taxas (R$)", "Sobra (R$)"],
    ...vendas.map((v) => [
      dataBr(v.data),
      v.id,
      v.status === "cancelled" ? "Cancelado" : "Pago",
      v.itens.map((i) => `${i.quantidade}x ${i.titulo}`).join(" | "),
      v.total,
      v.taxa,
      v.status === "cancelled" ? 0 : +(v.total - v.taxa).toFixed(2),
    ]),
  ]);
}

export function exportarHistorico(concorrentes: Concorrente[], historicos: Record<string, PontoPreco[]>, produtos: Produto[]) {
  const meu = new Map(produtos.map((p) => [p.id, p.titulo]));
  const linhas: Celula[][] = [["Data", "Concorrente", "Anúncio", "Código", "Preço (R$)", "Compete com"]];
  for (const c of concorrentes) {
    for (const h of historicos[c.id] ?? []) {
      linhas.push([dataBr(h.registrado_em), c.vendedor, c.titulo, c.item_id, h.preco, c.meu_item_id ? meu.get(c.meu_item_id) : ""]);
    }
  }
  baixar(`olheiro-historico-precos-${hoje()}.csv`, linhas);
}
