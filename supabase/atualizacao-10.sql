-- =====================================================================
-- MC JURÍDICO — ATUALIZAÇÃO 10 (pedido automático de avaliação)
-- Rode no Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- =====================================================================

-- Guarda quando a avaliação foi pedida, para não pedir de novo ao mesmo cliente em menos de 90 dias
alter table clientes add column if not exists avaliacao_pedida_em timestamptz;
