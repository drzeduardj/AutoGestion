const { query, transaction } = require('../../config/db');

const FACTURA_SELECT = `
  f.id,
  f.visita_id,
  f.tipo,
  f.cliente_nombre,
  f.numero,
  f.subtotal_servicios,
  f.subtotal_materiales,
  f.total,
  f.observaciones,
  f.emitida_por,
  CONCAT(u.nombre, ' ', u.apellido) AS emitida_por_nombre,
  f.estado,
  f.fecha_emision,
  f.fecha_creacion
`;

const getLineas = async (facturaId) => {
  const result = await query(
    `
      SELECT id, factura_id, tipo, descripcion, cantidad, precio_unitario, subtotal, producto_id
      FROM factura_lineas
      WHERE factura_id = $1
      ORDER BY id ASC
    `,
    [facturaId]
  );

  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${FACTURA_SELECT}
      FROM facturas f
      LEFT JOIN usuarios u ON u.id = f.emitida_por
      WHERE f.id = $1
      LIMIT 1
    `,
    [id]
  );

  const factura = result.rows[0];
  if (!factura) return null;

  factura.lineas = await getLineas(factura.id);
  return factura;
};

const findByVisitaId = async (visitaId) => {
  const result = await query(
    `
      SELECT ${FACTURA_SELECT}
      FROM facturas f
      LEFT JOIN usuarios u ON u.id = f.emitida_por
      WHERE f.visita_id = $1
      ORDER BY f.id DESC
      LIMIT 1
    `,
    [visitaId]
  );

  const factura = result.rows[0];
  if (!factura) return null;

  factura.lineas = await getLineas(factura.id);
  return factura;
};

const list = async ({ search } = {}) => {
  const params = [];
  let where = '';

  if (search) {
    params.push(`%${search}%`);
    where = `
      WHERE (
        f.numero ILIKE $1
        OR c.nombre ILIKE $1
        OR f.cliente_nombre ILIKE $1
        OR ve.placa ILIKE $1
        OR ve.marca ILIKE $1
        OR ve.modelo ILIKE $1
      )
    `;
  }

  const result = await query(
    `
      SELECT
        f.id,
        f.numero,
        f.tipo,
        f.total,
        f.fecha_emision,
        f.visita_id,
        COALESCE(c.nombre, f.cliente_nombre) AS cliente_nombre,
        ve.placa,
        ve.marca,
        ve.modelo
      FROM facturas f
      LEFT JOIN visitas vi ON vi.id = f.visita_id
      LEFT JOIN clientes c ON c.id = vi.cliente_id
      LEFT JOIN vehiculos ve ON ve.id = vi.vehiculo_id
      ${where}
      ORDER BY f.id DESC
    `,
    params
  );

  return result.rows;
};

const create = async (visitaId, { lineas, observaciones, emitidaPor }) => {
  const facturaId = await transaction(async (client) => {
    const numeroResult = await client.query(
      `SELECT 'FAC-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('factura_numero_seq')::text, 5, '0') AS numero`
    );
    const numero = numeroResult.rows[0].numero;

    let subtotalServicios = 0;
    let subtotalMateriales = 0;
    const lineasCalculadas = lineas.map((linea) => {
      const cantidad = Number(linea.cantidad) || 0;
      const precio = Number(linea.precio_unitario) || 0;
      const subtotal = Math.round(cantidad * precio * 100) / 100;

      if (linea.tipo === 'Material') {
        subtotalMateriales += subtotal;
      } else {
        subtotalServicios += subtotal;
      }

      return { ...linea, cantidad, precio_unitario: precio, subtotal };
    });

    const total = Math.round((subtotalServicios + subtotalMateriales) * 100) / 100;

    const facturaResult = await client.query(
      `
        INSERT INTO facturas (
          visita_id, numero, subtotal_servicios, subtotal_materiales, total, observaciones, emitida_por
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [visitaId, numero, subtotalServicios, subtotalMateriales, total, observaciones || null, emitidaPor || null]
    );

    const newFacturaId = facturaResult.rows[0].id;

    for (const linea of lineasCalculadas) {
      await client.query(
        `
          INSERT INTO factura_lineas (factura_id, tipo, descripcion, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [newFacturaId, linea.tipo, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.subtotal]
      );
    }

    return newFacturaId;
  });

  return findById(facturaId);
};

// Venta directa de productos (sin visita): crea la factura y DESCUENTA stock
// de las lineas que son productos de inventario, todo en una transaccion.
const createVenta = async ({ clienteNombre, lineas, observaciones, emitidaPor }) => {
  const facturaId = await transaction(async (client) => {
    const numeroResult = await client.query(
      `SELECT 'FAC-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('factura_numero_seq')::text, 5, '0') AS numero`
    );
    const numero = numeroResult.rows[0].numero;

    let subtotalServicios = 0;
    let subtotalMateriales = 0;
    const lineasCalculadas = lineas.map((linea) => {
      const cantidad = Number(linea.cantidad) || 0;
      const precio = Number(linea.precio_unitario) || 0;
      const subtotal = Math.round(cantidad * precio * 100) / 100;

      if (linea.tipo === 'Material') {
        subtotalMateriales += subtotal;
      } else {
        subtotalServicios += subtotal;
      }

      return { ...linea, cantidad, precio_unitario: precio, subtotal };
    });

    const total = Math.round((subtotalServicios + subtotalMateriales) * 100) / 100;

    const facturaResult = await client.query(
      `
        INSERT INTO facturas (
          visita_id, tipo, cliente_nombre, numero,
          subtotal_servicios, subtotal_materiales, total, observaciones, emitida_por
        )
        VALUES (NULL, 'Venta', $1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [clienteNombre || null, numero, subtotalServicios, subtotalMateriales, total, observaciones || null, emitidaPor || null]
    );

    const newFacturaId = facturaResult.rows[0].id;

    for (const linea of lineasCalculadas) {
      await client.query(
        `
          INSERT INTO factura_lineas (factura_id, tipo, descripcion, cantidad, precio_unitario, subtotal, producto_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [newFacturaId, linea.tipo, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.subtotal, linea.producto_id || null]
      );

      // Descuento de stock para productos de inventario (lanza si no hay suficiente).
      if (linea.producto_id) {
        await client.query(
          `SELECT aplicar_movimiento_inventario($1, $2, NULL, 'Salida'::tipo_movimiento_inventario, $3, $4, $5)`,
          [linea.producto_id, emitidaPor || null, linea.cantidad, `Venta ${numero}`, linea.descripcion]
        );
      }
    }

    return newFacturaId;
  });

  return findById(facturaId);
};

module.exports = {
  findById,
  findByVisitaId,
  list,
  create,
  createVenta
};
