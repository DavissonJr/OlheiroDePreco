"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IS_DEMO } from "@/lib/config";
import { concorrenteFicticio, criarDemo, sugestoesFicticias } from "@/lib/demo-data";
import { lerEstadoDemo, sairDemo, salvarEstadoDemo, sessaoDemoAtiva } from "@/lib/demo";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { AjustePreco, Alerta, CamposCusto, CamposRegra, CamposRepricing, Concorrente, Perfil, PontoPreco, Produto, Sugestao, Venda } from "@/lib/types";
import { DIAS_TESTE, PLANO_TESTE, PLANOS, type Ciclo, type PlanoPago } from "@/lib/planos";
import { normalizarProduto } from "@/lib/normalizar";

interface Estado {
  perfil: Perfil | null;
  produtos: Produto[];
  vendas: Venda[];
  concorrentes: Concorrente[];
  historicos: Record<string, PontoPreco[]>;
  alertas: Alerta[];
  ajustes: AjustePreco[];
}

type CamposPerfil = "nome" | "marketplaces" | "alerta_email" | "alerta_telegram" | "onboarding_ok" | "email_frequencia" | "resumo_semanal" | "interesse_whatsapp";

type Resultado = { ok: true } | { ok: false; erro: string; limite?: boolean };

interface Store extends Estado {
  demo: boolean;
  carregando: boolean;
  limiteConcorrentes: number;
  adicionarConcorrente: (link: string, meuItemId: string | null, catalogoId?: string | null) => Promise<Resultado>;
  removerConcorrente: (id: string) => Promise<void>;
  marcarAlertasLidos: () => Promise<void>;
  atualizarPerfil: (p: Partial<Pick<Perfil, CamposPerfil>>) => Promise<void>;
  atualizarProduto: (id: string, campos: Partial<Pick<Produto, CamposCusto | CamposRepricing>>) => Promise<Resultado>;
  atualizarRegras: (id: string, campos: Partial<Pick<Concorrente, CamposRegra>>) => Promise<Resultado>;
  sugerirConcorrentes: (produtoId: string) => Promise<Resultado & { sugestoes?: Sugestao[] }>;
  sincronizar: () => Promise<Resultado>;
  conectarTelegram: () => Promise<Resultado & { link?: string }>;
  assinar: (plano: PlanoPago, ciclo: Ciclo) => Promise<Resultado & { trocado?: boolean }>;
  iniciarTeste: () => Promise<Resultado & { ate?: string }>;
  cancelarAssinatura: () => Promise<Resultado & { ate?: string | null }>;
  excluirConta: () => Promise<Resultado>;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const VAZIO: Estado = { perfil: null, produtos: [], vendas: [], concorrentes: [], historicos: {}, alertas: [], ajustes: [] };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Tudo é carregado no navegador (inclusive o demo), então não há diferença
  // entre o HTML do servidor e o do cliente.
  const [estado, setEstado] = useState<Estado>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [demo, setDemo] = useState(IS_DEMO);
  const emDemo = useRef(IS_DEMO);
  const atual = useRef(estado);
  useEffect(() => {
    atual.current = estado;
    if (emDemo.current && estado.perfil?.id === "demo") salvarEstadoDemo(estado);
  }, [estado]);

  const carregar = useCallback(async () => {
    const modoDemo = IS_DEMO || sessaoDemoAtiva();
    emDemo.current = modoDemo;
    setDemo(modoDemo);
    if (modoDemo) {
      setEstado((e) => (e.perfil?.id === "demo" ? e : lerEstadoDemo<Estado>() ?? criarDemo()));
      setCarregando(false);
      return;
    }
    const sb = supabaseNavegador();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) {
      router.replace("/entrar");
      return;
    }
    const noventaDias = new Date(Date.now() - 90 * 86400000).toISOString();
    const [perfil, produtos, vendas, concorrentes, alertas, ajustes] = await Promise.all([
      sb.from("profiles").select("*").eq("id", auth.user.id).single(),
      sb.from("produtos").select("*").order("titulo"),
      sb.from("vendas").select("id,data,total,taxa,status,itens").gte("data", noventaDias).order("data", { ascending: false }),
      sb.from("concorrentes").select("*").order("created_at", { ascending: false }),
      sb.from("alertas").select("*").order("created_at", { ascending: false }).limit(60),
      sb.from("ajustes_preco").select("id,produto_id,preco_antigo,preco_novo,motivo,created_at").order("created_at", { ascending: false }).limit(50),
    ]);

    const ids = (concorrentes.data ?? []).map((c: Concorrente) => c.id);
    const historicos: Record<string, PontoPreco[]> = {};
    if (ids.length) {
      const { data: hist } = await sb
        .from("historico_precos")
        .select("concorrente_id,preco,registrado_em")
        .in("concorrente_id", ids)
        .gte("registrado_em", noventaDias)
        .order("registrado_em");
      for (const h of hist ?? []) {
        (historicos[h.concorrente_id] ??= []).push({ preco: h.preco, registrado_em: h.registrado_em });
      }
    }

    const p = perfil.data;
    setEstado({
      perfil: p
        ? {
            id: p.id,
            nome: p.nome,
            email: p.email,
            marketplaces: p.marketplaces ?? [],
            plano: p.plano,
            pro_ate: p.pro_ate,
            assinatura_ativa: p.assinatura_status === "authorized",
            assinatura_plano: p.assinatura_plano ?? null,
            assinatura_ciclo: p.assinatura_ciclo ?? null,
            teste_usado: !!p.teste_usado,
            cortesia_ate: p.cortesia_ate ?? null,
            codigo_indicacao: p.codigo_indicacao ?? null,
            indicacoes_ok: p.indicacoes_ok ?? 0,
            ml_nickname: p.ml_nickname,
            telegram_conectado: !!p.telegram_chat_id,
            alerta_email: p.alerta_email,
            alerta_telegram: p.alerta_telegram,
            email_frequencia: p.email_frequencia ?? "na_hora",
            resumo_semanal: p.resumo_semanal ?? true,
            interesse_whatsapp: !!p.interesse_whatsapp,
            onboarding_ok: p.onboarding_ok,
          }
        : null,
      produtos: (produtos.data ?? []).map(normalizarProduto),
      vendas: (vendas.data ?? []).map((v: Venda) => ({ ...v, total: Number(v.total), taxa: Number(v.taxa) })),
      concorrentes: (concorrentes.data ?? []).map((c: Concorrente) => ({
        ...c,
        preco_atual: c.preco_atual == null ? null : Number(c.preco_atual),
        preco_anterior: c.preco_anterior == null ? null : Number(c.preco_anterior),
        regra_queda_pct: c.regra_queda_pct == null ? null : Number(c.regra_queda_pct),
        regra_abaixo_de: c.regra_abaixo_de == null ? null : Number(c.regra_abaixo_de),
        regra_so_abaixo_do_meu: !!c.regra_so_abaixo_do_meu,
        sem_estoque: !!c.sem_estoque,
      })),
      historicos,
      alertas: alertas.data ?? [],
      ajustes: (ajustes.data ?? []).map((a: AjustePreco) => ({ ...a, preco_antigo: Number(a.preco_antigo), preco_novo: Number(a.preco_novo) })),
    });
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const limiteConcorrentes = PLANOS[estado.perfil?.plano ?? "gratis"].limiteConcorrentes;

  const adicionarConcorrente = useCallback(async (link: string, meuItemId: string | null, catalogoId?: string | null): Promise<Resultado> => {
    if (emDemo.current) {
      await espera(900);
      const m = link.match(/MLB-?(\d{6,})/i);
      if (!m) return { ok: false, erro: "Não encontrei o código do produto nesse link. Copie o endereço da página do produto no Mercado Livre." };
      const itemId = `MLB${m[1]}`;
      const e = atual.current;
      if (e.concorrentes.length >= PLANOS[e.perfil?.plano ?? "gratis"].limiteConcorrentes) {
        return { ok: false, erro: "limite", limite: true };
      }
      if (e.concorrentes.some((c) => c.item_id === itemId)) {
        return { ok: false, erro: "Você já está acompanhando esse anúncio." };
      }
      const { concorrente, historico } = concorrenteFicticio(itemId, e.produtos.find((p) => p.id === meuItemId));
      setEstado((x) => ({
        ...x,
        concorrentes: [concorrente, ...x.concorrentes],
        historicos: { ...x.historicos, [concorrente.id]: historico },
      }));
      return { ok: true };
    }
    const res = await fetch("/api/concorrentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link, meuItemId, catalogoId }),
    });
    const corpo = await res.json();
    if (res.status === 402) return { ok: false, erro: "limite", limite: true };
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Algo deu errado." };
    await carregar();
    return { ok: true };
  }, [carregar]);

  const removerConcorrente = useCallback(async (id: string) => {
    setEstado((e) => ({ ...e, concorrentes: e.concorrentes.filter((c) => c.id !== id) }));
    if (!emDemo.current) await supabaseNavegador().from("concorrentes").delete().eq("id", id);
  }, []);

  const marcarAlertasLidos = useCallback(async () => {
    setEstado((e) => ({ ...e, alertas: e.alertas.map((a) => ({ ...a, lido: true })) }));
    if (!emDemo.current) await supabaseNavegador().from("alertas").update({ lido: true }).eq("lido", false);
  }, []);

  const atualizarPerfil = useCallback<Store["atualizarPerfil"]>(async (p) => {
    const id = atual.current.perfil?.id;
    setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, ...p } } : e));
    if (!emDemo.current && id) await supabaseNavegador().from("profiles").update(p).eq("id", id);
  }, []);

  const atualizarProduto = useCallback<Store["atualizarProduto"]>(async (id, campos) => {
    setEstado((e) => ({ ...e, produtos: e.produtos.map((p) => (p.id === id ? { ...p, ...campos } : p)) }));
    if (emDemo.current) return { ok: true };
    const { error } = await supabaseNavegador().from("produtos").update(campos).eq("id", id);
    return error ? { ok: false, erro: "Não consegui salvar agora. Tente de novo." } : { ok: true };
  }, []);

  const atualizarRegras = useCallback<Store["atualizarRegras"]>(async (id, campos) => {
    setEstado((e) => ({ ...e, concorrentes: e.concorrentes.map((c) => (c.id === id ? { ...c, ...campos } : c)) }));
    if (emDemo.current) return { ok: true };
    const { error } = await supabaseNavegador().from("concorrentes").update(campos).eq("id", id);
    return error ? { ok: false, erro: "Não consegui salvar a regra agora. Tente de novo." } : { ok: true };
  }, []);

  const sugerirConcorrentes = useCallback<Store["sugerirConcorrentes"]>(async (produtoId) => {
    if (emDemo.current) {
      await espera(900);
      const e = atual.current;
      const produto = e.produtos.find((p) => p.id === produtoId);
      const seguidos = new Set(e.concorrentes.map((c) => c.item_id));
      return { ok: true, sugestoes: produto ? sugestoesFicticias(produto).filter((s) => !seguidos.has(s.item_id)) : [] };
    }
    const res = await fetch(`/api/concorrentes/sugestoes?produto=${encodeURIComponent(produtoId)}`);
    const corpo = await res.json();
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Algo deu errado." };
    return { ok: true, sugestoes: corpo.sugestoes as Sugestao[] };
  }, []);

  const sincronizar = useCallback(async (): Promise<Resultado> => {
    if (emDemo.current) {
      await espera(1400);
      return { ok: true };
    }
    const res = await fetch("/api/ml/sincronizar", { method: "POST" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false, erro: corpo.erro };
    await carregar();
    return { ok: true };
  }, [carregar]);

  const conectarTelegram = useCallback(async () => {
    if (emDemo.current) {
      await espera(700);
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, telegram_conectado: true } } : e));
      return { ok: true as const };
    }
    const res = await fetch("/api/telegram/codigo", { method: "POST" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false as const, erro: corpo.erro };
    return { ok: true as const, link: corpo.link as string };
  }, []);

  const assinar = useCallback<Store["assinar"]>(async (plano, ciclo) => {
    if (emDemo.current) {
      await espera(1100);
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, plano, assinatura_ativa: true, assinatura_plano: plano, assinatura_ciclo: ciclo } } : e));
      return { ok: true, trocado: true };
    }
    const res = await fetch("/api/assinatura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano, ciclo }),
    });
    const corpo = await res.json();
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Algo deu errado." };
    if (corpo.trocado) {
      await carregar();
      return { ok: true, trocado: true };
    }
    window.location.href = corpo.url;
    return { ok: true };
  }, [carregar]);

  const iniciarTeste = useCallback<Store["iniciarTeste"]>(async () => {
    if (emDemo.current) {
      await espera(700);
      const ate = new Date(Date.now() + DIAS_TESTE * 86400000).toISOString();
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, plano: PLANO_TESTE, teste_usado: true, cortesia_ate: ate } } : e));
      return { ok: true, ate };
    }
    const res = await fetch("/api/assinatura/teste", { method: "POST" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Algo deu errado." };
    await carregar();
    return { ok: true, ate: corpo.ate };
  }, [carregar]);

  const cancelarAssinatura = useCallback(async () => {
    if (emDemo.current) {
      await espera(800);
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, plano: "gratis", assinatura_ativa: false } } : e));
      return { ok: true as const, ate: null };
    }
    const res = await fetch("/api/assinatura", { method: "DELETE" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false as const, erro: corpo.erro ?? "Não consegui cancelar agora." };
    setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, assinatura_ativa: false, pro_ate: corpo.ate ?? null } } : e));
    return { ok: true as const, ate: corpo.ate as string | null };
  }, []);

  const excluirConta = useCallback(async (): Promise<Resultado> => {
    if (emDemo.current) {
      sairDemo();
      router.push("/");
      return { ok: true };
    }
    const res = await fetch("/api/conta/excluir", { method: "POST" });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Não consegui excluir a conta agora." };
    await supabaseNavegador().auth.signOut();
    router.push("/");
    return { ok: true };
  }, [router]);

  const sair = useCallback(async () => {
    if (emDemo.current) sairDemo();
    else await supabaseNavegador().auth.signOut();
    router.push("/");
  }, [router]);

  const valor = useMemo<Store>(
    () => ({
      ...estado,
      demo,
      carregando,
      limiteConcorrentes,
      adicionarConcorrente,
      removerConcorrente,
      marcarAlertasLidos,
      atualizarPerfil,
      atualizarProduto,
      atualizarRegras,
      sugerirConcorrentes,
      sincronizar,
      conectarTelegram,
      assinar,
      iniciarTeste,
      cancelarAssinatura,
      excluirConta,
      recarregar: carregar,
      sair,
    }),
    [estado, carregando, demo, limiteConcorrentes, adicionarConcorrente, removerConcorrente, marcarAlertasLidos, atualizarPerfil, atualizarProduto, atualizarRegras, sugerirConcorrentes, sincronizar, conectarTelegram, assinar, iniciarTeste, cancelarAssinatura, excluirConta, carregar, sair],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDados precisa estar dentro de <DadosProvider>");
  return v;
}
