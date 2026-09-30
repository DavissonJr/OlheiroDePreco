import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buscarItem, buscarPedido, mapearPedido, tokenValido } from "@/lib/ml";

// O Mercado Livre avisa aqui quando entra um pedido ou muda um anúncio.
// Configure esta URL em "Notificações" na sua aplicação do ML,
// com os tópicos orders_v2 e items. É preciso responder 200 rápido.
interface Notificacao {
  resource: string;
  user_id: number;
  topic: string;
}

export async function POST(req: Request) {
  const n = (await req.json().catch(() => null)) as Notificacao | null;
  if (!n?.resource) return NextResponse.json({ ok: true });

  after(async () => {
    const sb = supabaseAdmin();
    const { data: conta } = await sb.from("ml_contas").select("user_id").eq("ml_user_id", n.user_id).single();
    if (!conta) return;
    const acesso = await tokenValido(conta.user_id);
    if (!acesso) return;

    if (n.topic === "orders_v2") {
      const id = n.resource.split("/").pop()!;
      const pedido = await buscarPedido(id, acesso.token);
      await sb.from("vendas").upsert(mapearPedido(pedido, conta.user_id));
    }

    if (n.topic === "items" || n.topic === "items_prices") {
      const id = n.resource.match(/MLB\d+/)?.[0];
      if (!id) return;
      const item = await buscarItem(id, acesso.token);
      await sb.from("produtos").update({
        titulo: item.titulo,
        preco: item.preco,
        estoque: item.estoque,
        atualizado_em: new Date().toISOString(),
      }).eq("id", id).eq("user_id", conta.user_id);
    }
  });

  return NextResponse.json({ ok: true });
}
