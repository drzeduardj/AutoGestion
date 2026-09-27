-- Tipos de vehiculo para transporte de pasajeros. Cada uno tiene su diagrama de danos en
-- frontend/src/constants/recepcion.js (misma clave).
-- Bus liviano: microbuses tipo Hiace. Bus mediano: tipo Coaster/Rosa. Autobus: tamano completo.
-- Idempotente.

INSERT INTO tipos_vehiculo (clave, nombre, orden)
VALUES
  ('bus_liviano', 'Bus liviano', 5),
  ('bus_mediano', 'Bus mediano', 6),
  ('autobus', 'Autobús', 7)
ON CONFLICT (clave) DO NOTHING;
