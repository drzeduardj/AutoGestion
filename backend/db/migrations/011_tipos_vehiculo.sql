-- Catalogo de tipos de vehiculo. Cada tipo tiene su propio diagrama de danos en la recepcion
-- (frontend/src/constants/recepcion.js), que se elige por `clave`.
-- Reemplaza la columna de texto libre vehiculos.tipo_vehiculo por tipo_vehiculo_id.
-- Idempotente.

CREATE TABLE IF NOT EXISTS tipos_vehiculo (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(30) NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  estado estado_general NOT NULL DEFAULT 'Activo',
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tipos_vehiculo_clave UNIQUE (clave),
  CONSTRAINT uq_tipos_vehiculo_nombre UNIQUE (nombre)
);

INSERT INTO tipos_vehiculo (clave, nombre, orden)
VALUES
  ('turismo', 'Turismo', 1),
  ('camioneta', 'Camioneta', 2),
  ('pickup', 'Pickup', 3),
  ('camion', 'Camión', 4)
ON CONFLICT (clave) DO NOTHING;

ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS tipo_vehiculo_id INTEGER REFERENCES tipos_vehiculo(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_vehiculos_tipo_vehiculo_id ON vehiculos(tipo_vehiculo_id);

-- Pasa el texto libre anterior al catalogo y elimina la columna (solo la primera vez).
-- "pick..."/"troca" -> Pickup, Camioneta/SUV -> Camioneta, Camion -> Camion,
-- cualquier otro valor -> Turismo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehiculos' AND column_name = 'tipo_vehiculo'
  ) THEN
    UPDATE vehiculos v
    SET tipo_vehiculo_id = tv.id
    FROM tipos_vehiculo tv
    WHERE v.tipo_vehiculo_id IS NULL
      AND NULLIF(TRIM(v.tipo_vehiculo), '') IS NOT NULL
      AND tv.clave = CASE
        WHEN v.tipo_vehiculo ILIKE '%pick%' OR v.tipo_vehiculo ILIKE '%troca%' THEN 'pickup'
        WHEN v.tipo_vehiculo ILIKE '%camioneta%' OR v.tipo_vehiculo ILIKE '%suv%' THEN 'camioneta'
        WHEN v.tipo_vehiculo ILIKE '%cami_n%' THEN 'camion'
        ELSE 'turismo'
      END;

    ALTER TABLE vehiculos DROP COLUMN tipo_vehiculo;
  END IF;
END $$;

-- Diagrama con el que se registraron los danos de cada recepcion, para que no cambie si
-- despues se corrige el tipo del vehiculo. Las recepciones anteriores usaron el de turismo.
ALTER TABLE visita_recepciones
  ADD COLUMN IF NOT EXISTS tipo_diagrama VARCHAR(30);

UPDATE visita_recepciones
SET tipo_diagrama = 'turismo'
WHERE tipo_diagrama IS NULL;
