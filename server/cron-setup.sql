-- Programa la actualización automática de estados directamente en Supabase (pg_cron + pg_net),
-- sin depender de los límites de cron de Vercel. Gratis, corre siempre, aunque nadie abra la app.
--
-- Reemplaza la URL y el secreto antes de ejecutar esto en el SQL Editor de Supabase
-- (o pídeselo a Claude una vez tengas la URL real de Vercel, y lo programa por ti).

select cron.schedule(
  'actualizar-estados-patato',
  '0 * * * *', -- cada hora, en el minuto 0. Se puede cambiar por '*/15 * * * *' para cada 15 min.
  $$
  select net.http_get(
    url := 'https://TU-APP.vercel.app/api/cron/actualizar-estados',
    headers := jsonb_build_object('Authorization', 'Bearer TU_CRON_SECRET')
  );
  $$
);

-- Para ver los jobs programados:
-- select * from cron.job;

-- Para ver el historial de ejecuciones (éxito/error):
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Para eliminar el job (si algún día cambias de estrategia):
-- select cron.unschedule('actualizar-estados-patato');
