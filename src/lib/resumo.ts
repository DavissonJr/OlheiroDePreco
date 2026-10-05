// E-mails diários: avisos agrupados (quem escolheu "uma vez por dia") e o
// resumo semanal. Chamado uma vez por dia pelo agendador (veja supabase/agendador.sql).
import { supabaseAdmin } from "./supabase/server";
import { enviarEmails, escaparHtml, listaAvisosHtml, moldeEmail, type Email } from "./notificar";
import { menorRival } from "./margem";
import { porcentagem, primeiroNome, reais } from "./format";
import { SITE_URL } from "./config";
import type { Concorrente } from "./types";

const DIA = 86400000;
// A Resend grátis manda até 100 e-mails por dia; o resumo vai em levas,
// e cada pessoa recebe a cada 7 dias.
const LOTE_RESUMO = Number(process.env.RESUMO_LOTE) || 40;

export async function enviarAvisosDiarios() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("alertas")
    .select("id,user_id,mensagem,concorrentes(titulo),profiles!inner(email,alerta_email)")
    .eq("email_pendente", true)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw error;

  type Linha = { id: string; user_id: string; mensagem: string; concorrentes: { titulo: string } | null; profiles: { email: string | null; alerta_email: boolean } };
  const porUsuario = new Map<string, Linha[]>();
  for (const a of (data ?? []) as unknown as Linha[]) porUsuario.set(a.user_id, [...(porUsuario.get(a.user_id) ?? []), a]);

  const emails: Email[] = [];
  for (const lista of porUsuario.values()) {
    const p = lista[0].profiles;
    if (!p.email || !p.alerta_email) continue;
    // Avisos sem concorrente (compra rápida, ajuste) já trazem o título na mensagem.
    const itens = lista.map((a) => ({ titulo: a.concorrentes?.titulo ?? "Seu anúncio", mensagem: a.mensagem }));
    emails.push({
      para: p.email,
      assunto: itens.length === 1 ? "1 aviso de preço hoje" : `${itens.length} avisos de preço hoje`,
      html: moldeEmail("Seus avisos do dia", listaAvisosHtml(itens), { texto: "Ver os avisos", href: `${SITE_URL}/painel/alertas` }),
    });
  }
  await enviarEmails(emails);

  const ids = (data ?? []).map((a) => a.id);
  for (let i = 0; i < ids.length; i += 200) {
    await sb.from("alertas").update({ email_pendente: false }).in("id", ids.slice(i, i + 200));
  }
  return emails.length;
}

export async function enviarResumosSemanais() {
  const sb = supabaseAdmin();
  const umaSemana = new Date(Date.now() - 7 * DIA).toISOString();
  const { data: perfis, error } = await sb
    .from("profiles")
    .select("id,nome,email,created_at,resumo_enviado_em")
    .eq("resumo_semanal", true)
    .not("email", "is", null)
    .or(`resumo_enviado_em.lt.${umaSemana},and(resumo_enviado_em.is.null,created_at.lt.${umaSemana})`)
    .limit(LOTE_RESUMO);
  if (error) throw error;

  const emails: Email[] = [];
  const enviados: string[] = [];
  for (const p of perfis ?? []) {
    const html = await montarResumo(p.id, p.nome);
    enviados.push(p.id);
    if (html) emails.push({ para: p.email!, assunto: "Sua semana no Olheiro de Preço", html });
  }
  await enviarEmails(emails);
  if (enviados.length) {
    await sb.from("profiles").update({ resumo_enviado_em: new Date().toISOString() }).in("id", enviados);
  }
  return emails.length;
}

async function montarResumo(userId: string, nome: string | null) {
  const sb = supabaseAdmin();
  const agora = Date.now();
  const [vendas, alertas, concorrentes, produtos] = await Promise.all([
    sb.from("vendas").select("data,total,taxa,status").eq("user_id", userId).gte("data", new Date(agora - 14 * DIA).toISOString()),
    sb.from("alertas").select("tipo").eq("user_id", userId).gte("created_at", new Date(agora - 7 * DIA).toISOString()),
    sb.from("concorrentes").select("meu_item_id,preco_atual,sem_estoque").eq("user_id", userId).eq("ativo", true),
    sb.from("produtos").select("id,titulo,preco,buybox_ganhando").eq("user_id", userId),
  ]);

  const validas = (vendas.data ?? []).filter((v) => v.status !== "cancelled");
  const corte = agora - 7 * DIA;
  const semana = validas.filter((v) => new Date(v.data).getTime() >= corte);
  const anterior = validas.filter((v) => new Date(v.data).getTime() < corte);
  const fat = semana.reduce((s, v) => s + Number(v.total), 0);
  const fatAnt = anterior.reduce((s, v) => s + Number(v.total), 0);
  const sobra = semana.reduce((s, v) => s + Number(v.total) - Number(v.taxa), 0);

  const tipos = (alertas.data ?? []).map((a) => a.tipo);
  const quedas = tipos.filter((t) => t === "queda" || t === "abaixo_do_meu").length;
  const subidas = tipos.filter((t) => t === "subiu").length;
  const ajustes = tipos.filter((t) => t === "ajuste_preco").length;

  // Sugestões: anúncios seus com concorrente mais barato e compra rápida perdida.
  const sugestoes: string[] = [];
  for (const prod of produtos.data ?? []) {
    const lista = (concorrentes.data ?? [])
      .filter((c) => c.meu_item_id === prod.id)
      .map((c) => ({ ...c, preco_atual: c.preco_atual == null ? null : Number(c.preco_atual) })) as Concorrente[];
    const rival = menorRival(lista);
    if (rival != null && rival < Number(prod.preco)) {
      sugestoes.push(`<strong>${escaparHtml(prod.titulo)}</strong>: tem concorrente ${reais(Number(prod.preco) - rival)} mais barato que você.`);
    }
    if (prod.buybox_ganhando === false) {
      sugestoes.push(`<strong>${escaparHtml(prod.titulo)}</strong>: você não está ganhando a compra rápida do catálogo.`);
    }
  }

  // Sem nada pra contar, não manda e-mail vazio.
  if (!semana.length && !tipos.length && !sugestoes.length) return null;

  const variacao = fatAnt > 0 ? ` (${porcentagem((fat - fatAnt) / fatAnt)} sobre a semana anterior)` : "";
  const linha = (rotulo: string, valor: string) =>
    `<tr><td style="padding:6px 0;color:#41476a">${rotulo}</td><td style="padding:6px 0;text-align:right;font-weight:bold">${valor}</td></tr>`;

  const corpo = `
<p style="margin:0 0 16px">${nome ? `${escaparHtml(primeiroNome(nome))}, aqui` : "Aqui"} está o resumo dos últimos 7 dias.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">
${linha("Faturamento", `${reais(fat)}${variacao}`)}
${linha("Pedidos", String(semana.length))}
${linha("Sobra depois das taxas", reais(sobra))}
${linha("Quedas de preço de concorrentes", String(quedas))}
${linha("Aumentos de preço de concorrentes", String(subidas))}
${ajustes ? linha("Ajustes automáticos feitos", String(ajustes)) : ""}
</table>
${sugestoes.length ? `<h2 style="font-size:16px;margin:22px 0 8px">Vale olhar</h2><ul style="margin:0;padding-left:18px;line-height:1.5">${sugestoes.slice(0, 6).map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}`;

  return moldeEmail("Sua semana", corpo, { texto: "Abrir o painel", href: `${SITE_URL}/painel` });
}
