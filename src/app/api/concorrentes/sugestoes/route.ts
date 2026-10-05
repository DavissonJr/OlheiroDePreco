import { NextResponse } from "next/server";
import { supabaseAdmin, usuarioAtual } from "@/lib/supabase/server";
import { buscarParecidos, tokenValido } from "@/lib/ml";

// Sugere concorrentes pra um anúncio do vendedor (mesmo catálogo ou título parecido).
export async function GET(req: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ erro: "Entre na sua conta de novo." }, { status: 401 });
  const produtoId = new URL(req.url).searchParams.get("produto");
  if (!produtoId) return NextResponse.json({ erro: "Escolha um anúncio seu." }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: produto } = await sb
    .from("produtos")
    .select("id,titulo,catalogo_id")
    .eq("id", produtoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!produto) return NextResponse.json({ erro: "Não encontrei esse anúncio na sua conta." }, { status: 404 });

  const acesso = await tokenValido(user.id);
  if (!acesso) return NextResponse.json({ erro: "Conecte sua conta do Mercado Livre primeiro." }, { status: 400 });

  try {
    const [sugestoes, { data: jaSigo }] = await Promise.all([
      buscarParecidos(produto, acesso.mlUserId, acesso.token),
      sb.from("concorrentes").select("item_id").eq("user_id", user.id),
    ]);
    const seguidos = new Set((jaSigo ?? []).map((c) => c.item_id));
    return NextResponse.json({ sugestoes: sugestoes.filter((s) => s.item_id !== produto.id && !seguidos.has(s.item_id)) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: "O Mercado Livre não respondeu a busca agora. Tente de novo em alguns minutos." }, { status: 502 });
  }
}
