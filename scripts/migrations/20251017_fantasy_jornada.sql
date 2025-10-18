USE bufas_cards;

ALTER TABLE fantasy_rush
  ADD COLUMN IF NOT EXISTS jornada INT NULL AFTER week_start;

-- Permitir una selección única por jornada (NULLs permitidos múltiples)
CREATE INDEX IF NOT EXISTS idx_fr_jornada ON fantasy_rush(jornada);