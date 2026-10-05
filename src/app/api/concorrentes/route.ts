import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { apelidoVendedor, ErroAnuncio, extrairId, resolverConcorrente, tokenValido } from "@/lib/ml";
import { PLANOS, type PlanoId } from "@/lib/planos";

export async function POST(req: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });

  const { link, meuItemId, catalogoId } = (await req.json()) as { link: string; meuItemId?: string | null; catalogoId?: string | null };
  const lido = extrairId(link ?? "");
  // Sugestões já vêm com o catálogo; link colado traz o que estiver nele.
  const alvo = lido && catalogoId ? { ...lido, catalogoId } : lido;
  if (!alvo) {
    return NextResponse.json({ erro: "Não encontrei o código do produto nesse link. Copie o endereço da página do produto no Mercado Livre." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  if (meuItemId) {
    const { data: meu } = await sb.from("produtos").select("id").eq("id", meuItemId).eq("user_id", user.id).maybeSingle();
    if (!meu) return NextResponse.json({ erro: "Esse anúncio não é da sua conta." }, { status: 400 });
  }
  const { data: perfil } = await sb.from("profiles").select("plano").eq("id", user.id).single();
  const plano = (perfil?.plano ?? "gratis") as PlanoId;
  const { count } = await sb.from("concorrentes").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= PLANOS[plano].limiteConcorrentes) {
    return NextResponse.json({ erro: "limite", limite: PLANOS[plano].limiteConcorrentes }, { status: 402 });
  }

  const acesso = await tokenValido(user.id);
  if (!acesso) return NextResponse.json({ erro: "Conecte sua conta do Mercado Livre primeiro." }, { status: 400 });

  try {
    const item = await resolverConcorrente(alvo, acesso.mlUserId, acesso.token);
    const vendedor = await apelidoVendedor(item.vendedorId, acesso.token);

    const { data, error } = await sb.from("concorrentes").insert({
      user_id: user.id,
      meu_item_id: meuItemId || null,
      item_id: item.item_id,
      catalogo_id: item.catalogo_id,
      titulo: item.titulo,
      vendedor,
      thumbnail: item.thumbnail,
      permalink: item.permalink,
      preco_atual: item.preco,
      estoque: item.estoque,
      sem_estoque: item.estoque === 0,
      ultima_verificacao: new Date().toISOString(),
      proxima_verificacao: new Date(Date.now() + PLANOS[plano].intervaloHoras * 3600000).toISOString(),
    }).select().single();

    if (error?.code === "23505") {
      return NextResponse.json({ erro: "Você já está acompanhando esse anúncio." }, { status: 409 });
    }
    if (error) throw error;

    await sb.from("historico_precos").insert({ concorrente_id: data.id, preco: item.preco });
    return NextResponse.json({ concorrente: data });
  } catch (e) {
    if (e instanceof ErroAnuncio) return NextResponse.json({ erro: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ erro: "Não consegui ler esse produto no Mercado Livre agora. Tente de novo em alguns minutos." }, { status: 400 });
  }
}
