import type { Alerta, Concorrente, Perfil, PontoPreco, Produto, Venda } from "./types";

// Gerador pseudoaleatório com semente fixa: os dados de demonstração
// são sempre os mesmos, então os números não "pulam" a cada recarga.
function rng(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const DIA = 86400000;

export const PRODUTOS_DEMO: Produto[] = [
  { id: "MLB3810294417", titulo: "Fone Bluetooth TWS Pro com Cancelamento de Ruído", preco: 189.9, estoque: 42, thumbnail: null, permalink: null },
  { id: "MLB3920118735", titulo: "Carregador Turbo 20W USB-C", preco: 59.9, estoque: 118, thumbnail: null, permalink: null },
  { id: "MLB4011873526", titulo: "Suporte Veicular Magnético para Celular", preco: 39.9, estoque: 76, thumbnail: null, permalink: null },
  { id: "MLB3877410092", titulo: "Smartwatch D20 Fit com Monitor Cardíaco", preco: 129.9, estoque: 23, thumbnail: null, permalink: null },
  { id: "MLB3995521840", titulo: "Cabo USB-C Reforçado Nylon 2 metros", preco: 29.9, estoque: 204, thumbnail: null, permalink: null },
  { id: "MLB4102266591", titulo: "Mouse Sem Fio Silencioso Recarregável", preco: 74.9, estoque: 31, thumbnail: null, permalink: null },
  { id: "MLB3764490218", titulo: "Ring Light 26cm com Tripé 2 metros", preco: 99.9, estoque: 14, thumbnail: null, permalink: null },
];

const PESOS = [0.2, 0.2, 0.17, 0.1, 0.16, 0.1, 0.07];

function gerarVendas(): Venda[] {
  const r = rng(20260930);
  const vendas: Venda[] = [];
  const agora = Date.now();
  let seq = 2000019384;
  for (let d = 89; d >= 0; d--) {
    const diaSemana = new Date(agora - d * DIA).getDay();
    const fimDeSemana = diaSemana === 0 || diaSemana === 6;
    const tendencia = 1 + (89 - d) / 180; // crescimento leve ao longo do trimestre
    const base = (fimDeSemana ? 7 : 11) * tendencia;
    const qtd = Math.max(1, Math.round(base + (r() - 0.5) * 7));
    for (let n = 0; n < qtd; n++) {
      let x = r();
      let idx = 0;
      while (idx < PESOS.length - 1 && x > PESOS[idx]) {
        x -= PESOS[idx];
        idx++;
      }
      const p = PRODUTOS_DEMO[idx];
      const quantidade = r() > 0.85 ? 2 : 1;
      const total = +(p.preco * quantidade).toFixed(2);
      const hora = 8 + Math.floor(r() * 15);
      const data = new Date(agora - d * DIA);
      data.setHours(hora, Math.floor(r() * 60), 0, 0);
      if (data.getTime() > agora) data.setTime(agora - Math.floor(r() * 3600000));
      vendas.push({
        id: String(seq++),
        data: data.toISOString(),
        total,
        taxa: +(total * (p.preco < 79 ? 0.12 : 0.14) + (p.preco < 79 ? 6.25 * quantidade : 0)).toFixed(2),
        status: r() > 0.97 ? "cancelled" : "paid",
        itens: [{ item_id: p.id, titulo: p.titulo, quantidade, preco: p.preco }],
      });
    }
  }
  return vendas.sort((a, b) => b.data.localeCompare(a.data));
}

function historico(semente: number, final: number, inicial: number, quedaDiasAtras: number): PontoPreco[] {
  const r = rng(semente);
  const pontos: PontoPreco[] = [];
  const agora = Date.now();
  let preco = inicial;
  for (let d = 30; d >= 0; d--) {
    if (d === quedaDiasAtras) preco = final;
    else if (d > quedaDiasAtras && r() > 0.86) preco = +(inicial + (r() - 0.5) * 8).toFixed(2);
    pontos.push({ preco, registrado_em: new Date(agora - d * DIA).toISOString() });
  }
  return pontos;
}

export function criarDemo() {
  const agora = Date.now();
  const perfil: Perfil = {
    id: "demo",
    nome: "Marina Souza",
    email: "marina@exemplo.com.br",
    marketplaces: ["mercadolivre", "shopee"],
    plano: "gratis",
    pro_ate: null,
    assinatura_ativa: false,
    ml_nickname: "MARINAACESSORIOS",
    telegram_conectado: false,
    alerta_email: true,
    alerta_telegram: true,
    onboarding_ok: true,
  };

  const concorrentes: Concorrente[] = [
    {
      id: "c1", meu_item_id: "MLB3810294417", item_id: "MLB3810577201",
      titulo: "Fone De Ouvido Bluetooth Tws Pro Anc Original", vendedor: "CASADOFONE",
      thumbnail: null, permalink: null, preco_atual: 174.9, preco_anterior: 189.9,
      ultima_verificacao: new Date(agora - 12 * 60000).toISOString(), created_at: new Date(agora - 40 * DIA).toISOString(),
    },
    {
      id: "c2", meu_item_id: "MLB3920118735", item_id: "MLB3920930014",
      titulo: "Carregador Turbo 20w Tipo C Power Delivery", vendedor: "TECHMAIS_OFICIAL",
      thumbnail: null, permalink: null, preco_atual: 62.5, preco_anterior: 59.9,
      ultima_verificacao: new Date(agora - 12 * 60000).toISOString(), created_at: new Date(agora - 33 * DIA).toISOString(),
    },
    {
      id: "c3", meu_item_id: "MLB4011873526", item_id: "MLB4011220987",
      titulo: "Suporte Celular Carro Imã Magnético Painel", vendedor: "LOJA.ALFA",
      thumbnail: null, permalink: null, preco_atual: 37.9, preco_anterior: 41.9,
      ultima_verificacao: new Date(agora - 12 * 60000).toISOString(), created_at: new Date(agora - 28 * DIA).toISOString(),
    },
  ];

  const historicos: Record<string, PontoPreco[]> = {
    c1: historico(11, 174.9, 189.9, 0),
    c2: historico(22, 62.5, 59.9, 3),
    c3: historico(33, 37.9, 41.9, 6),
  };

  const alertas: Alerta[] = [
    {
      id: "a1", concorrente_id: "c1", tipo: "abaixo_do_meu",
      mensagem: "CASADOFONE baixou o fone TWS Pro para R$ 174,90. Agora está R$ 15,00 abaixo do seu anúncio.",
      preco_antigo: 189.9, preco_novo: 174.9, lido: false, created_at: new Date(agora - 12 * 60000).toISOString(),
    },
    {
      id: "a2", concorrente_id: "c2", tipo: "subiu",
      mensagem: "TECHMAIS_OFICIAL subiu o carregador 20W para R$ 62,50. Você está R$ 2,60 mais barato.",
      preco_antigo: 59.9, preco_novo: 62.5, lido: false, created_at: new Date(agora - 3 * DIA).toISOString(),
    },
    {
      id: "a3", concorrente_id: "c3", tipo: "abaixo_do_meu",
      mensagem: "LOJA.ALFA baixou o suporte magnético para R$ 37,90. Agora está R$ 2,00 abaixo do seu anúncio.",
      preco_antigo: 41.9, preco_novo: 37.9, lido: true, created_at: new Date(agora - 6 * DIA).toISOString(),
    },
  ];

  return { perfil, produtos: PRODUTOS_DEMO, vendas: gerarVendas(), concorrentes, historicos, alertas };
}

const VENDEDORES_FICTICIOS = ["MEGASTORE_BR", "IMPORTADOS.JP", "LOJA_DO_ZE", "PRIMEOFERTAS", "BRASILTECH"];

// No modo demonstração, "buscar" um anúncio gera um concorrente plausível
// próximo do preço do seu produto.
export function concorrenteFicticio(itemId: string, meu: Produto | undefined): { concorrente: Concorrente; historico: PontoPreco[] } {
  const semente = [...itemId].reduce((s, c) => s + c.charCodeAt(0), 0);
  const r = rng(semente);
  const base = meu?.preco ?? 99.9;
  const preco = +(base * (0.9 + r() * 0.2)).toFixed(2);
  const agora = new Date().toISOString();
  const id = `c${Date.now()}`;
  return {
    concorrente: {
      id,
      meu_item_id: meu?.id ?? null,
      item_id: itemId,
      titulo: meu ? `${meu.titulo.split(" ").slice(0, 4).join(" ")} Pronta Entrega` : "Anúncio concorrente",
      vendedor: VENDEDORES_FICTICIOS[Math.floor(r() * VENDEDORES_FICTICIOS.length)],
      thumbnail: null,
      permalink: null,
      preco_atual: preco,
      preco_anterior: null,
      ultima_verificacao: agora,
      created_at: agora,
    },
    historico: [{ preco, registrado_em: agora }],
  };
}
