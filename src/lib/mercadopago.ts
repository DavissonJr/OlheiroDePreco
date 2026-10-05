// Assinaturas recorrentes com o Mercado Pago (funciona com conta de CPF).
import { SITE_URL } from "./config";
import { PLANOS, precoCiclo, type Ciclo, type PlanoPago } from "./planos";

const API = "https://api.mercadopago.com";

function cabecalhos() {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

const motivo = (plano: PlanoPago, ciclo: Ciclo) =>
  `Olheiro de Preço ${PLANOS[plano].nome}${ciclo === "anual" ? " (anual)" : ""}`;

export async function criarAssinatura(userId: string, email: string, plano: PlanoPago, ciclo: Ciclo) {
  const res = await fetch(`${API}/preapproval`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify({
      reason: motivo(plano, ciclo),
      external_reference: userId,
      payer_email: email,
      back_url: `${SITE_URL}/painel/planos?assinatura=ok`,
      auto_recurring: {
        frequency: ciclo === "anual" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: precoCiclo(plano, ciclo),
        currency_id: "BRL",
      },
      status: "pending",
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago recusou a assinatura (${res.status}): ${await res.text()}`);
  const dados = await res.json();
  return dados.init_point as string;
}

export interface Assinatura {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference: string;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount: number; frequency: number; frequency_type: "months" | "days" };
}

// Troca de plano com a assinatura ativa: muda o valor das próximas cobranças.
export async function trocarPlanoMP(id: string, plano: PlanoPago, ciclo: Ciclo) {
  const res = await fetch(`${API}/preapproval/${id}`, {
    method: "PUT",
    headers: cabecalhos(),
    body: JSON.stringify({
      reason: motivo(plano, ciclo),
      auto_recurring: { transaction_amount: precoCiclo(plano, ciclo), currency_id: "BRL" },
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago recusou a troca de plano (${res.status}): ${await res.text()}`);
  return (await res.json()) as Assinatura;
}

export async function consultarAssinatura(id: string) {
  const res = await fetch(`${API}/preapproval/${id}`, { headers: cabecalhos(), cache: "no-store" });
  if (!res.ok) throw new Error(`Assinatura ${id} não encontrada (${res.status})`);
  return (await res.json()) as Assinatura;
}

export async function cancelarAssinaturaMP(id: string) {
  const res = await fetch(`${API}/preapproval/${id}`, {
    method: "PUT",
    headers: cabecalhos(),
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error(`Mercado Pago recusou o cancelamento (${res.status}): ${await res.text()}`);
  return (await res.json()) as Assinatura;
}
