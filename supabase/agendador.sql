-- =====================================================================
-- Olheiro de Preço: rotinas agendadas
-- Rode DEPOIS de publicar o site.
--
-- 1) Em Database > Extensions, ative "pg_cron" e "pg_net".
-- 2) Troque SEU-DOMINIO e SEU_CRON_SECRET abaixo (o mesmo valor da
--    variável CRON_SECRET na hospedagem) e rode tudo no SQL Editor.
-- =====================================================================

-- Confere os preços dos concorrentes a cada 15 minutos.
-- Cada rodada pega os concorrentes mais atrasados; o intervalo real de cada
-- um segue o plano do dono (6 h no Grátis, 1 h no Pro).
select cron.schedule(
  'olheiro-conferir-precos',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-DOMINIO/api/cron/precos',
    headers := '{"Authorization": "Bearer SEU_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Rebaixa pro Grátis quem cancelou o Pro e já passou do período pago. Todo dia às 3h.
select cron.schedule(
  'olheiro-fim-do-pro',
  '0 3 * * *',
  $$
  update public.profiles
     set plano = 'gratis'
   where plano = 'pro'
     and coalesce(assinatura_status, '') <> 'authorized'
     and (pro_ate is null or pro_ate < now());
  $$
);

-- Apaga histórico de preços com mais de 90 dias. Todo dia às 4h.
select cron.schedule(
  'olheiro-limpar-historico',
  '0 4 * * *',
  $$ delete from public.historico_precos where registrado_em < now() - interval '90 days' $$
);

-- Pra conferir se ficou tudo agendado:
--   select jobname, schedule from cron.job;
-- Pra ver as últimas execuções:
--   select * from cron.job_run_details order by start_time desc limit 20;
