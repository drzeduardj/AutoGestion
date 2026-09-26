const { query } = require('../../config/db');

const CLIENTE_SELECT = `
  id,
  nombre,
  identidad_rtn,
  telefono,
  whatsapp,
  email,
  direccion,
  observaciones,
  estado,
  fecha_creacion,
  fecha_actualizacion
`;

const list = async ({ search, estado } = {}) => {
  const filters = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      nombre ILIKE $${params.length}
      OR identidad_rtn ILIKE $${params.length}
      OR telefono ILIKE $${params.length}
      OR whatsapp ILIKE $${params.length}
      OR email ILIKE $${params.length}
      OR EXISTS (
        SELECT 1 FROM vehiculos v
        WHERE v.cliente_id = clientes.id AND v.placa ILIKE $${params.length}
      )
    )`);
  }

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}::estado_general`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(
    `
      SELECT
        ${CLIENTE_SELECT},
        (
          SELECT string_agg(v.placa, ', ' ORDER BY v.placa)
          FROM vehiculos v
          WHERE v.cliente_id = clientes.id
        ) AS placas
      FROM clientes
      ${where}
      ORDER BY fecha_creacion DESC, id DESC
    `,
    params
  );

  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `
      SELECT ${CLIENTE_SELECT}
      FROM clientes
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const create = async (cliente) => {
  const result = await query(
    `
      INSERT INTO clientes (
        nombre,
        identidad_rtn,
        telefono,
        whatsapp,
        email,
        direccion,
        observaciones,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::estado_general, 'Activo'::estado_general))
      RETURNING id
    `,
    [
      cliente.nombre,
      cliente.identidad_rtn || null,
      cliente.telefono || null,
      cliente.whatsapp || null,
      cliente.email || null,
      cliente.direccion || null,
      cliente.observaciones || null,
      cliente.estado || 'Activo'
    ]
  );

  return findById(result.rows[0].id);
};

const update = async (id, fields) => {
  const allowedFields = [
    'nombre',
    'identidad_rtn',
    'telefono',
    'whatsapp',
    'email',
    'direccion',
    'observaciones',
    'estado'
  ];
  const sets = [];
  const params = [];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      params.push(fields[field]);
      sets.push(field === 'estado' ? `${field} = $${params.length}::estado_general` : `${field} = $${params.length}`);
    }
  });

  if (!sets.length) {
    return findById(id);
  }

  params.push(id);

  const result = await query(
    `
      UPDATE clientes
      SET ${sets.join(', ')}
      WHERE id = $${params.length}
      RETURNING id
    `,
    params
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

const updateEstado = async (id, estado) => {
  const result = await query(
    `
      UPDATE clientes
      SET estado = $1::estado_general
      WHERE id = $2
      RETURNING id
    `,
    [estado, id]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(result.rows[0].id);
};

module.exports = {
  list,
  findById,
  create,
  update,
  updateEstado
};
