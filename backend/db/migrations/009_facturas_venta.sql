-- Permite facturas de venta directa (sin visita) y el descuento de stock.
-- Aditivo e idempotente.

-- La visita deja de ser obligatoria (las ventas directas no tienen visita).
ALTER TABLE facturas ALTER COLUMN visita_id DROP NOT NULL;

-- Tipo de factura: 'Visita' (reparacion) o 'Venta' (venta directa de productos).
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'Visita';

-- Cliente para ventas directas (cuando no hay visita de donde tomar el nombre).
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(150);

-- Referencia al producto en la linea (para descontar stock de las ventas).
ALTER TABLE factura_lineas
  ADD COLUMN IF NOT EXISTS producto_id INTEGER
  REFERENCES productos(id) ON DELETE SET NULL;
