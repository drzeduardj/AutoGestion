const { query, transaction } = require('../../config/db');

const FLUJO_SELECT = `
  id,
  nombre,
  descripcion,
  estado,
  fecha_creacion,
  fecha_actualizacion
`;

const ETAPA_SELECT = `
  id,
  flujo_trabajo_id,
  nombre,
  descripcion,
  orden,
  duracion_estimada_horas,
  alerta_sin_avance_horas,
  estado,
  fecha_creacion,
  fecha_actualizacion
`;

const listFlujos = async ({ estado } = {}) => {
  const params = [];
  const filters = [];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}::estado_general`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const result = await query(
    `
      SELECT ${FLUJO_SELECT}
      FROM flujos_trabajo
      ${where}
      ORDER BY nombre ASC
    `,
    params
  );

  return result.rows;
};

const findFlujoById = async (id) => {
  const result = await query(
    `
      SELECT ${FLUJO_SELECT}
      FROM flujos_trabajo
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

const flujoActivo = async (id) => {
  if (!id) {
    return true;
  }

  const result = await query(
    'SELECT id FROM flujos_trabajo WHERE id = $1 AND estado = $2::estado_general LIMIT 1',
    [id, 'Activo']
  );

  return Boolean(result.rows[0]);
};

const listEtapasByFlujo = async (flujoTrabajoId, { estado = 'Activo' } = {}) => {
  const params = [flujoTrabajoId];
  const filters = ['flujo_trabajo_id = $1'];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}::estado_general`);
  }

  const result = await query(
    `
      SELECT ${ETAPA_SELECT}
      FROM flujo_etapas
      WHERE ${filters.join(' AND ')}
      ORDER BY orden ASC, id ASC
    `,
    params
  );

  return result.rows;
};

const listFlujosWithEtapas = async ({ estado = 'Activo' } = {}) => {
  const flujos = await listFlujos({ estado });
  const etapasResult = await query(
    `
      SELECT ${ETAPA_SELECT}
      FROM flujo_etapas
      WHERE estado = $1::estado_general
      ORDER BY flujo_trabajo_id ASC, orden ASC, id ASC
    `,
    ['Activo']
  );

  const etapasByFlujo = etapasResult.rows.reduce((acc, etapa) => {
    acc[etapa.flujo_trabajo_id] = acc[etapa.flujo_trabajo_id] || [];
    acc[etapa.flujo_trabajo_id].push(etapa);
    return acc;
  }, {});

  return flujos.map((flujo) => ({
    ...flujo,
    etapas: etapasByFlujo[flujo.id] || []
  }));
};

// Con `client` se ejecuta dentro de una transaccion existente (ej. al crear la visita);
// sin el, abre su propia transaccion.
const inicializarEtapasVisita = async ({ visitaId, flujoTrabajoId, usuarioId, replace = false, client: outerClient }) => {
  const etapas = await listEtapasByFlujo(flujoTrabajoId);
  const run = outerClient ? (callback) => callback(outerClient) : transaction;

  await run(async (client) => {
    if (replace) {
      await client.query('DELETE FROM visita_etapas WHERE visita_id = $1', [visitaId]);
    }

    for (const etapa of etapas) {
      await client.query(
        `
          INSERT INTO visita_etapas (
            visita_id,
            flujo_etapa_id,
            nombre_etapa,
            descripcion,
            orden,
            estado,
            fecha_inicio,
            actualizado_por
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            CASE WHEN $5 = 1 THEN 'En proceso'::estado_etapa_visita ELSE 'Pendiente'::estado_etapa_visita END,
            CASE WHEN $5 = 1 THEN NOW() ELSE NULL END,
            $6
          )
          ON CONFLICT (visita_id, orden) DO NOTHING
        `,
        [
          visitaId,
          etapa.id,
          etapa.nombre,
          etapa.descripcion || null,
          etapa.orden,
          usuarioId || null
        ]
      );
    }

    await client.query(
      `
        UPDATE visitas
        SET
          flujo_trabajo_id = $1,
          fecha_ultima_actividad = NOW()
        WHERE id = $2
      `,
      [flujoTrabajoId, visitaId]
    );
  });

  return etapas;
};

module.exports = {
  listFlujos,
  findFlujoById,
  flujoActivo,
  listEtapasByFlujo,
  listFlujosWithEtapas,
  inicializarEtapasVisita
};
