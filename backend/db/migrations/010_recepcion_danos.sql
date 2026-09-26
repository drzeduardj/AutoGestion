-- Reporte de danos de carroceria en la recepcion del vehiculo.
-- danos: { "<zona>": { "tipos": ["G", "R", ...], "nota": "..." } }
-- Idempotente.

ALTER TABLE visita_recepciones
  ADD COLUMN IF NOT EXISTS danos JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE visita_recepciones
  ADD COLUMN IF NOT EXISTS observaciones_danos TEXT;
