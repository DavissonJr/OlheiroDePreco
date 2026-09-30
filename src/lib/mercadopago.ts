// Assinaturas recorrentes com o Mercado Pago (funciona com conta de CPF).
import { SITE_URL } from "./config";
import { PLANOS } from "./planos";

const API = "https://api.mercadopago.com";

function cabecalhos() {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function criarAssinatura(userId: string, email: string) {
  const res = await fetch(`${API}/preapproval`, {
    method: "POST",
    headers: cabecalhos(),
    body: JSON.stringify({
      reason: "Olheiro de Preço Pro",
      external_reference: userId,
      payer_email: email,
      back_url: `${SITE_URL}/painel/planos?assinatura=ok`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLANOS.pro.preco,
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
