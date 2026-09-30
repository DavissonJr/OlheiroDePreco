export type PlanoId = "gratis" | "pro";

export const PLANOS: Record<PlanoId, {
  nome: string;
  preco: number;
  limiteConcorrentes: number;
  intervaloHoras: number;
  recursos: string[];
}> = {
  gratis: {
    nome: "Grátis",
    preco: 0,
    limiteConcorrentes: 3,
    intervaloHoras: 6,
    recursos: [
      "Painel de vendas do Mercado Livre",
      "3 concorrentes monitorados",
      "Preços conferidos a cada 6 horas",
      "Avisos por e-mail",
    ],
  },
  pro: {
    nome: "Pro",
    preco: 49,
    limiteConcorrentes: 50,
    intervaloHoras: 1,
    recursos: [
      "Tudo do plano Grátis",
      "50 concorrentes monitorados",
      "Preços conferidos a cada hora",
      "Avisos no Telegram na hora",
      "Histórico de preços de 90 dias",
    ],
  },
};
