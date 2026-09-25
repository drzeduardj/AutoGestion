const { query } = require('../../config/db');

const TRABAJO_SELECT = `
  v.id,
  v.cliente_id,
  c.nombre AS cliente_nombre,
  c.telefono AS cliente_telefono,
  c.whatsapp AS cliente_whatsapp,
  v.vehiculo_id,
  ve.placa,
  ve.marca,
  ve.modelo,
  ve.anio,
  ve.color,
  v.mecanico_asignado_id,
  CONCAT(um.nombre, ' ', um.apellido) AS mecanico_asignado_nombre,
  v.flujo_trabajo_id,
  ft.nombre AS flujo_trabajo_nombre,
  v.fecha_ingreso,
  v.fecha_entrega_estimada,
  v.fecha_entrega_real,
  v.kilometraje_ingreso,
  v.motivo_visita,
  v.descripcion_problema,
  v.diagnostico,
  v.estado,
  v.observaciones,
  v.fecha_ultima_actividad,
  v.fecha_actualizacion,
  COALESCE(vp.porcentaje_avance, 0) AS porcentaje_avance
`;

const assignmentFilter = `
  (
    v.mecanico_asignado_id = $1
    OR EXISTS (
      SELECT 1
      FROM visita_servicios vs
      WHERE vs.visita_id = v.id
        AND vs.mecanico_id = $1
    )
  )
`;

const listMisTrabajos = async (mecanicoId, { estado, activas = true } = {}) => {
  const params = [mecanicoId];
  const filters = [assignmentFilter];

  if (estado) {
    params.push(estado);
    filters.push(`v.estado = $${params.length}::estado_visita`);
  }

  if (activas) {
    // Un trabajo finalizado ya queda en manos de recepcion/caja: sale del
    // tablero del mecanico.
    filters.push("v.estado NOT IN ('Finalizado'::estado_visita, 'Entregado'::estado_visita, 'Cancelado'::estado_visita)");
  }

  const result = await query(
    `
      SELECT ${TRABAJO_SELECT}
      FROM visitas v
      INNER JOIN clientes c ON c.id = v.cliente_id
      INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
      LEFT JOIN usuarios um ON um.id = v.mecanico_asignado_id
      LEFT JOIN flujos_trabajo ft ON ft.id = v.flujo_trabajo_id
      LEFT JOIN vista_progreso_visitas vp ON vp.visita_id = v.id
      WHERE ${filters.join(' AND ')}
      ORDER BY v.fecha_ingreso DESC, v.id DESC
    `,
    params
  );

  return result.rows;
};

const findTrabajoById = async (mecanicoId, visitaId) => {
  const result = await query(
    `
      SELECT ${TRABAJO_SELECT}
      FROM visitas v
      INNER JOIN clientes c ON c.id = v.cliente_id
      INNER JOIN vehiculos ve ON ve.id = v.vehiculo_id
      LEFT JOIN usuarios um ON um.id = v.mecanico_asignado_id
      LEFT JOIN flujos_trabajo ft ON ft.id = v.flujo_trabajo_id
      LEFT JOIN vista_progreso_visitas vp ON vp.visita_id = v.id
      WHERE v.id = $2
        AND ${assignmentFilter}
      LIMIT 1
    `,
    [mecanicoId, visitaId]
  );

  return result.rows[0] || null;
};

const updateEstado = async (mecanicoId, visitaId, { estado, observaciones, diagnostico }) => {
  const result = await query(
    `
      UPDATE visitas v
      SET
        estado = $3::estado_visita,
        observaciones = COALESCE($4, v.observaciones),
        diagnostico = COALESCE($5, v.diagnostico),
        fecha_ultima_actividad = NOW()
      WHERE v.id = $2
        AND ${assignmentFilter}
      RETURNING v.id
    `,
    [mecanicoId, visitaId, estado, observaciones || null, diagnostico || null]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findTrabajoById(mecanicoId, result.rows[0].id);
};

module.exports = {
  listMisTrabajos,
  findTrabajoById,
  updateEstado
};
