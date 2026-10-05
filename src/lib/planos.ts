export type PlanoId = "gratis" | "basico" | "pro" | "turbo";
export type PlanoPago = Exclude<PlanoId, "gratis">;
export type Ciclo = "mensal" | "anual";

// O que cada plano libera. A conferência no servidor usa a mesma lista,
// então não dá pra ligar um recurso pago só mexendo no navegador.
export type Recurso =
  | "telegram"   // avisos no Telegram
  | "regras"     // regras de aviso personalizadas
  | "sugestao"   // sugestão de preço com margem
  | "buybox"     // avisar quando perder a compra rápida do catálogo
  | "estoque"    // avisar quando o concorrente ficar sem estoque
  | "repricing"; // ajuste automático de preço

export const PLANOS: Record<PlanoId, {
  nome: string;
  preco: number;          // por mês
  limiteConcorrentes: number;
  intervaloHoras: number;
  liberado: Recurso[];
  recursos: string[];
}> = {
  gratis: {
    nome: "Grátis",
    preco: 0,
    limiteConcorrentes: 3,
    intervaloHoras: 6,
    liberado: [],
    recursos: [
      "Painel de vendas do Mercado Livre",
      "3 concorrentes monitorados",
      "Preços conferidos a cada 6 horas",
      "Avisos por e-mail e resumo semanal",
    ],
  },
  basico: {
    nome: "Básico",
    preco: 19,
    limiteConcorrentes: 15,
    intervaloHoras: 3,
    liberado: ["telegram"],
    recursos: [
      "Tudo do plano Grátis",
      "15 concorrentes monitorados",
      "Preços conferidos a cada 3 horas",
      "Avisos no Telegram",
    ],
  },
  pro: {
    nome: "Pro",
    preco: 49,
    limiteConcorrentes: 50,
    intervaloHoras: 1,
    liberado: ["telegram", "regras", "sugestao", "buybox", "estoque"],
    recursos: [
      "Tudo do plano Básico",
      "50 concorrentes monitorados",
      "Preços conferidos a cada hora",
      "Regras de aviso (ex.: só se cair mais de 5%)",
      "Sugestão de preço com a sua margem",
      "Aviso quando você perde a compra rápida do catálogo",
      "Aviso quando o concorrente fica sem estoque",
    ],
  },
  turbo: {
    nome: "Turbo",
    preco: 99,
    limiteConcorrentes: 150,
    intervaloHoras: 0.5,
    liberado: ["telegram", "regras", "sugestao", "buybox", "estoque", "repricing"],
    recursos: [
      "Tudo do plano Pro",
      "150 concorrentes monitorados",
      "Preços conferidos a cada 30 minutos",
      "Ajuste automático de preço, com piso que você define",
    ],
  },
};

export const PLANOS_PAGOS: PlanoPago[] = ["basico", "pro", "turbo"];

// Anual: paga 10 meses e leva 12.
export const MESES_COBRADOS_NO_ANUAL = 10;
export const precoCiclo = (plano: PlanoPago, ciclo: Ciclo) =>
  ciclo === "anual" ? PLANOS[plano].preco * MESES_COBRADOS_NO_ANUAL : PLANOS[plano].preco;

// Teste grátis e bônus de indicação
export const DIAS_TESTE = 7;
export const PLANO_TESTE: PlanoPago = "pro";
export const DIAS_BONUS_INDICACAO = 30;

export const temRecurso = (plano: PlanoId | null | undefined, r: Recurso) =>
  PLANOS[plano ?? "gratis"]?.liberado.includes(r) ?? false;

// Menor plano que libera um recurso (pra mostrar "disponível no Pro").
export const planoMinimo = (r: Recurso): PlanoPago =>
  PLANOS_PAGOS.find((p) => PLANOS[p].liberado.includes(r)) ?? "turbo";

export function descreverIntervalo(horas: number) {
  if (horas < 1) return `${Math.round(horas * 60)} minutos`;
  return horas === 1 ? "hora" : `${horas} horas`;
}

// Descobre o plano a partir do valor e da frequência que o Mercado Pago devolve.
// Assim o webhook não precisa confiar em nada que veio do navegador.
export function planoPorCobranca(valor: number, meses: number): { plano: PlanoPago; ciclo: Ciclo } | null {
  for (const plano of PLANOS_PAGOS) {
    for (const ciclo of ["mensal", "anual"] as const) {
      const m = ciclo === "anual" ? 12 : 1;
      if (m === meses && Math.abs(precoCiclo(plano, ciclo) - valor) < 0.01) return { plano, ciclo };
    }
  }
  return null;
}
