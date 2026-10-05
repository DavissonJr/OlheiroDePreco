// Rotina que confere os preços dos concorrentes e dispara os avisos.
// Chamada a cada 15 minutos pelo agendador do Supabase (veja supabase/agendador.sql).
// Na mesma rodada: estoque dos concorrentes, compra rápida do catálogo e ajuste automático.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase/server";
import { alterarPreco, apelidoVendedor, lerAnuncio, tokenValido, vencedorCatalogo, type CacheCatalogo } from "./ml";
import { enviarEmails, enviarTelegram, escaparHtml, listaAvisosHtml, moldeEmail, type Email } from "./notificar";
import { PLANOS, temRecurso, type PlanoId } from "./planos";
import { alvoRepricing, custosDoProduto, menorRival, precoMinimo } from "./margem";
import { reais } from "./format";
import { urlDoSite } from "./config";
import type { Concorrente, Produto, TipoAlerta } from "./types";
import { normalizarProduto } from "./normalizar";

interface PerfilAviso {
  plano: PlanoId;
  email: string | null;
  telegram_chat_id: string | null;
  alerta_email: boolean;
  alerta_telegram: boolean;
  email_frequencia: "na_hora" | "diario";
}

interface Linha {
  id: string;
  user_id: string;
  item_id: string;
  catalogo_id: string | null;
  titulo: string;
  vendedor: string | null;
  meu_item_id: string | null;
  preco_atual: number | null;
  ultima_verificacao: string | null;
  sem_estoque: boolean;
  regra_queda_pct: number | null;
  regra_abaixo_de: number | null;
  regra_so_abaixo_do_meu: boolean;
  profiles: PerfilAviso;
}

const PERFIL_COLUNAS = "plano,email,telegram_chat_id,alerta_email,alerta_telegram,email_frequencia";

// Quantos concorrentes conferir por rodada. No plano gratuito da Cloudflare cada
// chamada pode fazer só 50 requisições externas, então lá use CONFERENCIA_LOTE=8.
const LOTE = Number(process.env.CONFERENCIA_LOTE) || 150;
// Produtos de catálogo conferidos por rodada (compra rápida).
const LOTE_CATALOGO = Math.max(3, Math.round(LOTE / 3));
// Para antes de o agendador desistir de esperar a resposta (60 s).
const ORCAMENTO_MS = 50_000;
// Depois de um ajuste automático, espera isso antes de mexer no mesmo anúncio de novo.
const PAUSA_REPRICING_MS = 10 * 60000;

const horas = (h: number) => h * 3600000;
const proximaConferencia = (plano: PlanoId) =>
  new Date(Date.now() + horas(PLANOS[plano]?.intervaloHoras ?? 6)).toISOString();

// Avisos que vão pro Telegram/e-mail no fim da rodada, agrupados por pessoa:
// uma mensagem com tudo, em vez de uma por mudança.
type Saida = Map<string, { perfil: PerfilAviso; itens: { titulo: string; mensagem: string }[] }>;

function enfileirar(saida: Saida, userId: string, perfil: PerfilAviso, titulo: string, mensagem: string) {
  const s = saida.get(userId) ?? { perfil, itens: [] };
  s.itens.push({ titulo, mensagem });
  saida.set(userId, s);
}

async function registrarAviso(
  sb: SupabaseClient,
  saida: Saida,
  a: {
    userId: string;
    perfil: PerfilAviso;
    concorrenteId: string | null;
    tipo: TipoAlerta;
    titulo: string;
    mensagem: string;
    precoAntigo?: number | null;
    precoNovo?: number | null;
    avisarFora: boolean; // false = só aparece no app
  },
) {
  const porEmail = a.avisarFora && a.perfil.alerta_email && !!a.perfil.email;
  await sb.from("alertas").insert({
    user_id: a.userId,
    concorrente_id: a.concorrenteId,
    tipo: a.tipo,
    // Avisos sobre o seu anúncio (sem concorrente ligado) levam o título junto, pra lista do app.
    mensagem: a.concorrenteId ? a.mensagem : `${a.titulo}: ${a.mensagem}`,
    preco_antigo: a.precoAntigo ?? null,
    preco_novo: a.precoNovo ?? null,
    // Quem escolheu e-mail uma vez por dia recebe tudo junto no envio diário.
    email_pendente: porEmail && a.perfil.email_frequencia === "diario",
  });
  if (a.avisarFora) enfileirar(saida, a.userId, a.perfil, a.titulo, a.mensagem);
}

// Regras de aviso do Pro: todas as que estiverem preenchidas precisam bater.
function passaNasRegras(c: Linha, antigo: number, novo: number, meu: number | undefined) {
  if (!temRecurso(c.profiles.plano, "regras")) return true;
  if (c.regra_queda_pct != null && ((antigo - novo) / antigo) * 100 < c.regra_queda_pct) return false;
  if (c.regra_abaixo_de != null && novo >= c.regra_abaixo_de) return false;
  if (c.regra_so_abaixo_do_meu && (meu == null || novo >= meu)) return false;
  return true;
}

export async function verificarPrecos() {
  const sb = supabaseAdmin();
  const prazo = Date.now() + ORCAMENTO_MS;
  const saida: Saida = new Map();
  const tokens = new Map<string, Awaited<ReturnType<typeof tokenValido>>>();
  const token = async (userId: string) => {
    if (!tokens.has(userId)) tokens.set(userId, await tokenValido(userId).catch(() => null));
    return tokens.get(userId) ?? null;
  };

  // Fila: só quem já passou da hora da próxima conferência, do mais atrasado pro menos.
  const { data, error } = await sb
    .from("concorrentes")
    .select(`id,user_id,item_id,catalogo_id,titulo,vendedor,meu_item_id,preco_atual,ultima_verificacao,sem_estoque,regra_queda_pct,regra_abaixo_de,regra_so_abaixo_do_meu,profiles!inner(${PERFIL_COLUNAS})`)
    .eq("ativo", true)
    .lte("proxima_verificacao", new Date().toISOString())
    .order("proxima_verificacao", { ascending: true })
    .limit(LOTE);
  if (error) throw error;
  const pendentes = data as unknown as Linha[];

  const porUsuario = new Map<string, Linha[]>();
  for (const c of pendentes) porUsuario.set(c.user_id, [...(porUsuario.get(c.user_id) ?? []), c]);

  let verificados = 0;
  let avisos = 0;
  // Vendedores de cada catálogo, lidos uma vez por rodada
  const catalogos: CacheCatalogo = new Map();
  // Produtos do vendedor cujos concorrentes foram conferidos agora (candidatos ao ajuste automático).
  const tocados = new Map<string, { perfil: PerfilAviso; produtos: Set<string> }>();

  for (const [userId, lista] of porUsuario) {
    if (Date.now() > prazo) break;
    const acesso = await token(userId);
    if (!acesso) {
      // Conta do ML desconectada ou token revogado: tira da frente da fila por 6 h.
      await sb
        .from("concorrentes")
        .update({ proxima_verificacao: new Date(Date.now() + horas(6)).toISOString() })
        .in("id", lista.map((c) => c.id));
      continue;
    }

    const meusIds = [...new Set(lista.map((c) => c.meu_item_id).filter(Boolean))] as string[];
    const { data: meus } = meusIds.length
      ? await sb.from("produtos").select("id,preco").eq("user_id", userId).in("id", meusIds)
      : { data: [] as { id: string; preco: number }[] };
    const meuPreco = new Map((meus ?? []).map((p) => [p.id, Number(p.preco)]));

    for (const c of lista) {
      if (Date.now() > prazo) break;
      const leitura = await lerAnuncio(c.item_id, c.catalogo_id, acesso.token, catalogos);
      const preco = leitura.preco;
      verificados++;
      const p = c.profiles;
      const primeira = c.ultima_verificacao == null;
      const quem = c.vendedor ?? "Um concorrente";
      const meu = c.meu_item_id ? meuPreco.get(c.meu_item_id) : undefined;
      if (c.meu_item_id) {
        const t = tocados.get(userId) ?? { perfil: p, produtos: new Set<string>() };
        t.produtos.add(c.meu_item_id);
        tocados.set(userId, t);
      }

      const mudou = preco != null && (c.preco_atual == null || Math.abs(preco - c.preco_atual) >= 0.01);
      await sb.from("concorrentes").update({
        ...(preco != null ? { preco_atual: preco } : {}),
        ...(mudou && c.preco_atual != null ? { preco_anterior: c.preco_atual } : {}),
        estoque: leitura.estoque,
        sem_estoque: leitura.semEstoque,
        ultima_verificacao: new Date().toISOString(),
        proxima_verificacao: proximaConferencia(p.plano),
      }).eq("id", c.id);

      // Estoque: quando o concorrente zera, é a hora de subir o preço.
      if (!primeira && leitura.semEstoque !== c.sem_estoque && temRecurso(p.plano, "estoque")) {
        const acabou = leitura.semEstoque;
        await registrarAviso(sb, saida, {
          userId, perfil: p, concorrenteId: c.id,
          tipo: acabou ? "sem_estoque" : "voltou_estoque",
          titulo: c.titulo,
          mensagem: acabou
            ? `${quem} ficou sem estoque. Pode ser uma boa hora pra subir o seu preço.`
            : `${quem} voltou a ter estoque${preco != null ? `, por ${reais(preco)}` : ""}.`,
          precoNovo: preco,
          avisarFora: acabou,
        });
        avisos++;
      }

      if (!mudou || preco == null) continue;
      await sb.from("historico_precos").insert({ concorrente_id: c.id, preco });
      if (c.preco_atual == null) continue; // primeira leitura, nada a comparar

      let tipo: TipoAlerta;
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

      // Aumento de preço fica só no app; quedas vão pro Telegram/e-mail se passarem nas regras.
      await registrarAviso(sb, saida, {
        userId, perfil: p, concorrenteId: c.id, tipo, titulo: c.titulo, mensagem,
        precoAntigo: c.preco_atual, precoNovo: preco,
        avisarFora: tipo !== "subiu" && passaNasRegras(c, c.preco_atual, preco, meu),
      });
      avisos++;
    }
  }

  let ajustes = 0;
  for (const [userId, t] of tocados) {
    if (Date.now() > prazo) break;
    if (!temRecurso(t.perfil.plano, "repricing")) continue;
    const acesso = await token(userId);
    if (!acesso) continue;
    ajustes += await ajustarPrecos(sb, saida, userId, t.perfil, [...t.produtos], acesso.token);
  }

  const catalogo = Date.now() < prazo ? await conferirCatalogo(sb, saida, token, prazo) : 0;

  await despachar(saida);
  return { verificados, avisos, ajustes, catalogo };
}

// Ajuste automático (plano Turbo): acompanha o concorrente mais barato,
// sem passar do piso que o vendedor definiu nem do custo do produto.
async function ajustarPrecos(sb: SupabaseClient, saida: Saida, userId: string, perfil: PerfilAviso, produtoIds: string[], token: string) {
  const { data: produtos } = await sb
    .from("produtos")
    .select("*")
    .eq("user_id", userId)
    .eq("repricing_ativo", true)
    .not("repricing_piso", "is", null)
    .in("id", produtoIds);
  if (!produtos?.length) return 0;

  const { data: rivais } = await sb
    .from("concorrentes")
    .select("meu_item_id,preco_atual,sem_estoque")
    .eq("user_id", userId)
    .eq("ativo", true)
    .in("meu_item_id", produtos.map((p) => p.id));

  let feitos = 0;
  for (const bruto of produtos) {
    const p = normalizarProduto(bruto);
    if (p.repricing_ultimo_em && Date.now() - new Date(p.repricing_ultimo_em).getTime() < PAUSA_REPRICING_MS) continue;
    const lista = (rivais ?? [])
      .filter((r) => r.meu_item_id === p.id)
      .map((r) => ({ ...r, preco_atual: r.preco_atual == null ? null : Number(r.preco_atual) })) as Concorrente[];
    const custos = custosDoProduto(p, []);
    const alvo = alvoRepricing({
      atual: p.preco,
      rival: menorRival(lista),
      piso: p.repricing_piso!,
      teto: p.repricing_teto,
      diferenca: p.repricing_diferenca,
      pisoCusto: custos ? precoMinimo(custos, 0) : null,
    });
    if (alvo == null) continue;

    try {
      await alterarPreco(p.id, alvo, token);
    } catch (e) {
      console.error("Ajuste automático falhou", p.id, e);
      // Sem permissão de escrita ou anúncio bloqueado: desliga pra não insistir.
      await sb.from("produtos").update({ repricing_ativo: false }).eq("id", p.id).eq("user_id", userId);
      await registrarAviso(sb, saida, {
        userId, perfil, concorrenteId: null, tipo: "ajuste_preco", titulo: p.titulo,
        mensagem: "O Mercado Livre não deixou mudar o preço deste anúncio, então desligamos o ajuste automático dele. Reconecte sua conta em Conta e ligue de novo.",
        avisarFora: true,
      });
      continue;
    }

    const motivo = alvo < p.preco ? "acompanhar o concorrente mais barato" : "subir com o concorrente";
    await sb.from("produtos").update({ preco: alvo, repricing_ultimo_em: new Date().toISOString() }).eq("id", p.id).eq("user_id", userId);
    await sb.from("ajustes_preco").insert({ user_id: userId, produto_id: p.id, preco_antigo: p.preco, preco_novo: alvo, motivo });
    await registrarAviso(sb, saida, {
      userId, perfil, concorrenteId: null, tipo: "ajuste_preco", titulo: p.titulo,
      mensagem: `Ajustamos seu preço de ${reais(p.preco)} para ${reais(alvo)} pra ${motivo}.`,
      precoAntigo: p.preco, precoNovo: alvo,
      avisarFora: true,
    });
    feitos++;
  }
  return feitos;
}

// Compra rápida do catálogo (Pro e Turbo): avisa quando outro vendedor passa a ganhar.
async function conferirCatalogo(
  sb: SupabaseClient,
  saida: Saida,
  token: (userId: string) => Promise<{ token: string } | null>,
  prazo: number,
) {
  const planos = (Object.keys(PLANOS) as PlanoId[]).filter((p) => temRecurso(p, "buybox"));
  // O intervalo mais curto entre os planos com o recurso; o de cada um é conferido abaixo.
  const menor = Math.min(...planos.map((p) => PLANOS[p].intervaloHoras));
  const limite = new Date(Date.now() - horas(menor)).toISOString();
  const { data } = await sb
    .from("produtos")
    .select(`id,user_id,titulo,preco,catalogo_id,buybox_ganhando,buybox_verificado_em,profiles!inner(${PERFIL_COLUNAS})`)
    .not("catalogo_id", "is", null)
    .in("profiles.plano", planos)
    .or(`buybox_verificado_em.is.null,buybox_verificado_em.lt.${limite}`)
    .order("buybox_verificado_em", { ascending: true, nullsFirst: true })
    .limit(LOTE_CATALOGO);

  let feitos = 0;
  for (const p of (data ?? []) as unknown as (Pick<Produto, "id" | "titulo" | "catalogo_id" | "buybox_ganhando" | "buybox_verificado_em"> & { user_id: string; preco: number; profiles: PerfilAviso })[]) {
    if (Date.now() > prazo) break;
    const perfil = p.profiles;
    const intervalo = horas(PLANOS[perfil.plano].intervaloHoras);
    if (p.buybox_verificado_em && Date.now() - new Date(p.buybox_verificado_em).getTime() < intervalo) continue;
    const acesso = await token(p.user_id);
    if (!acesso) continue;

    const vencedor = await vencedorCatalogo(p.catalogo_id!, acesso.token).catch(() => undefined);
    if (vencedor === undefined) continue;
    const ganhando = vencedor?.item_id === p.id;
    let quem: string | null = null;
    if (!ganhando && vencedor && p.buybox_ganhando !== false) {
      quem = await apelidoVendedor(vencedor.seller_id ?? null, acesso.token);
    }

    await sb.from("produtos").update({
      buybox_ganhando: ganhando,
      buybox_preco: vencedor?.price ?? null,
      ...(quem ? { buybox_vencedor: quem } : ganhando ? { buybox_vencedor: null } : {}),
      buybox_verificado_em: new Date().toISOString(),
    }).eq("id", p.id).eq("user_id", p.user_id);
    feitos++;

    // Primeira leitura só registra o estado.
    if (p.buybox_ganhando == null || p.buybox_ganhando === ganhando) continue;
    await registrarAviso(sb, saida, {
      userId: p.user_id, perfil, concorrenteId: null,
      tipo: ganhando ? "buybox_ganha" : "buybox_perdida",
      titulo: p.titulo,
      mensagem: ganhando
        ? "Você voltou a ganhar a compra rápida do catálogo."
        : `Você perdeu a compra rápida do catálogo${quem ? ` para ${quem}` : ""}${vencedor ? `, que vende por ${reais(vencedor.price)}` : ""}.`,
      precoAntigo: ganhando ? null : Number(p.preco),
      precoNovo: vencedor?.price ?? null,
      avisarFora: !ganhando,
    });
  }
  return feitos;
}

// Manda uma mensagem por pessoa com todos os avisos da rodada.
async function despachar(saida: Saida) {
  const emails: Email[] = [];
  for (const { perfil: p, itens } of saida.values()) {
    if (!itens.length) continue;
    const link = `${urlDoSite()}/painel/alertas`;
    if (p.alerta_telegram && p.telegram_chat_id && temRecurso(p.plano, "telegram")) {
      const texto = itens.length === 1
        ? `<b>${escaparHtml(itens[0].titulo)}</b>\n${escaparHtml(itens[0].mensagem)}\n\n${link}`
        : `<b>${itens.length} avisos de preço</b>\n\n${itens.map((i) => `• <b>${escaparHtml(i.titulo)}</b>\n${escaparHtml(i.mensagem)}`).join("\n\n")}\n\n${link}`;
      await enviarTelegram(p.telegram_chat_id, texto);
    }
    if (p.alerta_email && p.email && p.email_frequencia === "na_hora") {
      const assunto = itens.length === 1 ? `Aviso de preço: ${itens[0].titulo}` : `${itens.length} avisos de preço`;
      emails.push({
        para: p.email,
        assunto,
        html: moldeEmail(itens.length === 1 ? "Novidade nos seus concorrentes" : `${itens.length} novidades nos seus concorrentes`, listaAvisosHtml(itens), { texto: "Ver os avisos", href: link }),
      });
    }
  }
  await enviarEmails(emails);
}
