const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCurto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const inteiro = new Intl.NumberFormat("pt-BR");

export const reais = (v: number | null | undefined) => (v == null ? "—" : brl.format(v));
export const reaisCurto = (v: number) => brlCurto.format(v);
export const numero = (v: number) => inteiro.format(v);

export function porcentagem(v: number, casas = 1) {
  const s = (v * 100).toFixed(casas).replace(".", ",");
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function tempoRelativo(iso: string | null) {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "").replace(" de ", " ");
}

export function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", "");
}

export function primeiroNome(nome: string | null | undefined) {
  return (nome ?? "").trim().split(/\s+/)[0] || "";
}
