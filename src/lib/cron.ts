// Rotas chamadas pelo agendador do Supabase são protegidas por um segredo.
export function cronAutorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  return !!segredo && req.headers.get("authorization") === `Bearer ${segredo}`;
}
