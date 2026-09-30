"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IS_DEMO } from "@/lib/config";
import { concorrenteFicticio, criarDemo } from "@/lib/demo-data";
import { supabaseNavegador } from "@/lib/supabase/client";
import type { Alerta, Concorrente, Perfil, PontoPreco, Produto, Venda } from "@/lib/types";
import { PLANOS } from "@/lib/planos";

interface Estado {
  perfil: Perfil | null;
  produtos: Produto[];
  vendas: Venda[];
  concorrentes: Concorrente[];
  historicos: Record<string, PontoPreco[]>;
  alertas: Alerta[];
}

type Resultado = { ok: true } | { ok: false; erro: string; limite?: boolean };

interface Store extends Estado {
  demo: boolean;
  carregando: boolean;
  limiteConcorrentes: number;
  adicionarConcorrente: (link: string, meuItemId: string | null) => Promise<Resultado>;
  removerConcorrente: (id: string) => Promise<void>;
  marcarAlertasLidos: () => Promise<void>;
  atualizarPerfil: (p: Partial<Pick<Perfil, "nome" | "marketplaces" | "alerta_email" | "alerta_telegram" | "onboarding_ok">>) => Promise<void>;
  sincronizar: () => Promise<Resultado>;
  conectarTelegram: () => Promise<Resultado & { link?: string }>;
  assinarPro: () => Promise<Resultado>;
  cancelarProDemo: () => void;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const VAZIO: Estado = { perfil: null, produtos: [], vendas: [], concorrentes: [], historicos: {}, alertas: [] };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Tudo é carregado no navegador (inclusive o demo), então não há diferença
  // entre o HTML do servidor e o do cliente.
  const [estado, setEstado] = useState<Estado>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const atual = useRef(estado);
  useEffect(() => {
    atual.current = estado;
  }, [estado]);

  const carregar = useCallback(async () => {
    if (IS_DEMO) {
      setEstado((e) => (e.perfil ? e : criarDemo()));
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
    const [perfil, produtos, vendas, concorrentes, alertas] = await Promise.all([
      sb.from("profiles").select("*").eq("id", auth.user.id).single(),
      sb.from("produtos").select("id,titulo,preco,thumbnail,permalink,estoque").order("titulo"),
      sb.from("vendas").select("id,data,total,taxa,status,itens").gte("data", noventaDias).order("data", { ascending: false }),
      sb.from("concorrentes").select("*").order("created_at", { ascending: false }),
      sb.from("alertas").select("*").order("created_at", { ascending: false }).limit(60),
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
            ml_nickname: p.ml_nickname,
            telegram_conectado: !!p.telegram_chat_id,
            alerta_email: p.alerta_email,
            alerta_telegram: p.alerta_telegram,
            onboarding_ok: p.onboarding_ok,
          }
        : null,
      produtos: produtos.data ?? [],
      vendas: (vendas.data ?? []).map((v: Venda) => ({ ...v, total: Number(v.total), taxa: Number(v.taxa) })),
      concorrentes: (concorrentes.data ?? []).map((c: Concorrente) => ({
        ...c,
        preco_atual: c.preco_atual == null ? null : Number(c.preco_atual),
        preco_anterior: c.preco_anterior == null ? null : Number(c.preco_anterior),
      })),
      historicos,
      alertas: alertas.data ?? [],
    });
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const limiteConcorrentes = PLANOS[estado.perfil?.plano ?? "gratis"].limiteConcorrentes;

  const adicionarConcorrente = useCallback(async (link: string, meuItemId: string | null): Promise<Resultado> => {
    if (IS_DEMO) {
      await espera(900);
      const m = link.match(/MLB-?(\d{6,})/i);
      if (!m) return { ok: false, erro: "Não encontrei o código do anúncio nesse link. Copie o endereço da página do produto no Mercado Livre." };
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
      body: JSON.stringify({ link, meuItemId }),
    });
    const corpo = await res.json();
    if (res.status === 402) return { ok: false, erro: "limite", limite: true };
    if (!res.ok) return { ok: false, erro: corpo.erro ?? "Algo deu errado." };
    await carregar();
    return { ok: true };
  }, [carregar]);

  const removerConcorrente = useCallback(async (id: string) => {
    setEstado((e) => ({ ...e, concorrentes: e.concorrentes.filter((c) => c.id !== id) }));
    if (!IS_DEMO) await supabaseNavegador().from("concorrentes").delete().eq("id", id);
  }, []);

  const marcarAlertasLidos = useCallback(async () => {
    setEstado((e) => ({ ...e, alertas: e.alertas.map((a) => ({ ...a, lido: true })) }));
    if (!IS_DEMO) await supabaseNavegador().from("alertas").update({ lido: true }).eq("lido", false);
  }, []);

  const atualizarPerfil = useCallback<Store["atualizarPerfil"]>(async (p) => {
    const id = atual.current.perfil?.id;
    setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, ...p } } : e));
    if (!IS_DEMO && id) await supabaseNavegador().from("profiles").update(p).eq("id", id);
  }, []);

  const sincronizar = useCallback(async (): Promise<Resultado> => {
    if (IS_DEMO) {
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
    if (IS_DEMO) {
      await espera(700);
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, telegram_conectado: true } } : e));
      return { ok: true as const };
    }
    const res = await fetch("/api/telegram/codigo", { method: "POST" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false as const, erro: corpo.erro };
    return { ok: true as const, link: corpo.link as string };
  }, []);

  const assinarPro = useCallback(async (): Promise<Resultado> => {
    if (IS_DEMO) {
      await espera(1100);
      setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, plano: "pro" } } : e));
      return { ok: true };
    }
    const res = await fetch("/api/assinatura", { method: "POST" });
    const corpo = await res.json();
    if (!res.ok) return { ok: false, erro: corpo.erro };
    window.location.href = corpo.url;
    return { ok: true };
  }, []);

  const cancelarProDemo = useCallback(() => {
    setEstado((e) => (e.perfil ? { ...e, perfil: { ...e.perfil, plano: "gratis" } } : e));
  }, []);

  const sair = useCallback(async () => {
    if (!IS_DEMO) await supabaseNavegador().auth.signOut();
    router.push("/");
  }, [router]);

  const valor = useMemo<Store>(
    () => ({
      ...estado,
      demo: IS_DEMO,
      carregando,
      limiteConcorrentes,
      adicionarConcorrente,
      removerConcorrente,
      marcarAlertasLidos,
      atualizarPerfil,
      sincronizar,
      conectarTelegram,
      assinarPro,
      cancelarProDemo,
      recarregar: carregar,
      sair,
    }),
    [estado, carregando, limiteConcorrentes, adicionarConcorrente, removerConcorrente, marcarAlertasLidos, atualizarPerfil, sincronizar, conectarTelegram, assinarPro, cancelarProDemo, carregar, sair],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDados precisa estar dentro de <DadosProvider>");
  return v;
}
