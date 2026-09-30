// Rotina que confere os preços dos concorrentes e dispara os avisos.
// Chamada de hora em hora pelo agendador do Supabase (veja supabase/schema.sql).
import { supabaseAdmin } from "./supabase/server";
import { precoDeVenda, tokenValido } from "./ml";
import { enviarEmail, enviarTelegram, escaparHtml } from "./notificar";
import { PLANOS, type PlanoId } from "./planos";
import { reais } from "./format";
import { SITE_URL } from "./config";

interface Linha {
  id: string;
  user_id: string;
  item_id: string;
  titulo: string;
  vendedor: string | null;
  meu_item_id: string | null;
  preco_atual: number | null;
  ultima_verificacao: string | null;
  profiles: {
    plano: PlanoId;
    email: string | null;
    telegram_chat_id: string | null;
    alerta_email: boolean;
    alerta_telegram: boolean;
  };
}

// Quantos concorrentes conferir por rodada. No plano gratuito da Cloudflare cada
// chamada pode fazer só 50 requisições externas, então lá use CONFERENCIA_LOTE=10.
const LOTE = Number(process.env.CONFERENCIA_LOTE) || 150;
// Para antes de o agendador desistir de esperar a resposta (60 s).
const ORCAMENTO_MS = 50_000;

export async function verificarPrecos() {
  const sb = supabaseAdmin();
  // Fila: só quem já passou da hora da próxima conferência, do mais atrasado pro menos.
  const { data, error } = await sb
    .from("concorrentes")
    .select("id,user_id,item_id,titulo,vendedor,meu_item_id,preco_atual,ultima_verificacao,profiles!inner(plano,email,telegram_chat_id,alerta_email,alerta_telegram)")
    .eq("ativo", true)
    .lte("proxima_verificacao", new Date().toISOString())
    .order("proxima_verificacao", { ascending: true })
    .limit(LOTE);
  if (error) throw error;
  const pendentes = data as unknown as Linha[];

  const proxima = (plano: PlanoId) =>
    new Date(Date.now() + (PLANOS[plano]?.intervaloHoras ?? 6) * 3600000).toISOString();

  const porUsuario = new Map<string, Linha[]>();
  for (const c of pendentes) porUsuario.set(c.user_id, [...(porUsuario.get(c.user_id) ?? []), c]);

  let verificados = 0;
  let avisos = 0;
  const prazo = Date.now() + ORCAMENTO_MS;

  for (const [userId, lista] of porUsuario) {
    if (Date.now() > prazo) break;
    const acesso = await tokenValido(userId).catch(() => null);
    if (!acesso) {
      // Conta do ML desconectada ou token revogado: tira da frente da fila por 6 h.
      await sb
        .from("concorrentes")
        .update({ proxima_verificacao: new Date(Date.now() + 6 * 3600000).toISOString() })
        .in("id", lista.map((c) => c.id));
      continue;
    }

    const meusIds = [...new Set(lista.map((c) => c.meu_item_id).filter(Boolean))] as string[];
    const { data: meus } = meusIds.length
      ? await sb.from("produtos").select("id,preco,titulo").in("id", meusIds)
      : { data: [] as { id: string; preco: number; titulo: string }[] };
    const meuPreco = new Map((meus ?? []).map((p) => [p.id, p.preco as number]));

    for (const c of lista) {
      if (Date.now() > prazo) break;
      const preco = await precoDeVenda(c.item_id, acesso.token);
      verificados++;
      const agoraIso = new Date().toISOString();
      const proximaIso = proxima(c.profiles.plano);

      if (preco == null) {
        await sb.from("concorrentes").update({ ultima_verificacao: agoraIso, proxima_verificacao: proximaIso }).eq("id", c.id);
        continue;
      }

      const mudou = c.preco_atual == null || Math.abs(preco - c.preco_atual) >= 0.01;
      await sb.from("concorrentes").update({
        preco_atual: preco,
        ...(mudou && c.preco_atual != null ? { preco_anterior: c.preco_atual } : {}),
        ultima_verificacao: agoraIso,
        proxima_verificacao: proximaIso,
      }).eq("id", c.id);

      if (!mudou) continue;
      await sb.from("historico_precos").insert({ concorrente_id: c.id, preco });
      if (c.preco_atual == null) continue; // primeira leitura, nada a comparar

      const meu = c.meu_item_id ? meuPreco.get(c.meu_item_id) : undefined;
      const quem = c.vendedor ?? "Um concorrente";
      let tipo: "queda" | "abaixo_do_meu" | "subiu";
      let mensagem: string;

      if (preco < c.preco_atual) {
        if (meu != null && preco < meu) {
          tipo = "abaixo_do_meu";
          mensagem = `${quem} baixou para ${reais(preco)}. Agora está ${reais(meu - preco)} abaixo do seu anúncio.`;
        } else {
          tipo = "queda";
          mensagem = `${quem} baixou de ${reais(c.preco_atual)} para ${reais(preco)}.`;
        }
      } else {
        tipo = "subiu";
        mensagem = meu != null && meu < preco
          ? `${quem} subiu para ${reais(preco)}. Você está ${reais(preco - meu)} mais barato.`
          : `${quem} subiu de ${reais(c.preco_atual)} para ${reais(preco)}.`;
      }

      await sb.from("alertas").insert({
        user_id: userId,
        concorrente_id: c.id,
        tipo,
        mensagem,
        preco_antigo: c.preco_atual,
        preco_novo: preco,
      });
      avisos++;

      // Aumento de preço fica só no app; quedas também vão pro Telegram/e-mail.
      if (tipo === "subiu") continue;
      const p = c.profiles;
      const texto = `<b>${escaparHtml(c.titulo)}</b>\n${escaparHtml(mensagem)}\n\n${SITE_URL}/painel/concorrentes`;
      if (p.alerta_telegram && p.telegram_chat_id && p.plano === "pro") {
        await enviarTelegram(p.telegram_chat_id, texto);
      }
      if (p.alerta_email && p.email) {
        await enviarEmail(
          p.email,
          `Preço caiu: ${c.titulo}`,
          `<p><strong>${escaparHtml(c.titulo)}</strong></p><p>${escaparHtml(mensagem)}</p><p><a href="${SITE_URL}/painel/concorrentes">Abrir o Olheiro de Preço</a></p>`,
        );
      }
    }
  }

  return { verificados, avisos };
}
