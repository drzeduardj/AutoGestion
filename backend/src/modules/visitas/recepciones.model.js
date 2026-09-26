const { query } = require('../../config/db');

const RECEPCION_SELECT = `
  vr.id,
  vr.visita_id,
  vr.nivel_combustible,
  vr.exteriores,
  vr.interiores,
  vr.accesorios,
  vr.componentes_mecanicos,
  vr.danos,
  vr.observaciones_danos,
  vr.trabajo_a_realizar,
  vr.comentarios_cliente,
  vr.autoriza_presupuesto_previo,
  vr.autoriza_sin_presupuesto,
  vr.autoriza_pruebas,
  vr.acepta_condiciones,
  vr.nombre_aceptacion,
  vr.firma_cliente,
  vr.recibido_por,
  CONCAT(u.nombre, ' ', u.apellido) AS recibido_por_nombre,
  vr.fecha_recepcion,
  vr.fecha_creacion,
  vr.fecha_actualizacion
`;

const findByVisitaId = async (visitaId) => {
  const result = await query(
    `
      SELECT ${RECEPCION_SELECT}
      FROM visita_recepciones vr
      LEFT JOIN usuarios u ON u.id = vr.recibido_por
      WHERE vr.visita_id = $1
      LIMIT 1
    `,
    [visitaId]
  );

  return result.rows[0] || null;
};

const upsertByVisitaId = async (visitaId, payload) => {
  const result = await query(
    `
      INSERT INTO visita_recepciones (
        visita_id,
        nivel_combustible,
        exteriores,
        interiores,
        accesorios,
        componentes_mecanicos,
        trabajo_a_realizar,
        comentarios_cliente,
        autoriza_presupuesto_previo,
        autoriza_sin_presupuesto,
        autoriza_pruebas,
        acepta_condiciones,
        nombre_aceptacion,
        firma_cliente,
        recibido_por,
        fecha_recepcion,
        danos,
        observaciones_danos
      )
      VALUES (
        $1,
        $2,
        $3::jsonb,
        $4::jsonb,
        $5::jsonb,
        $6::jsonb,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        COALESCE($16, NOW()),
        $17::jsonb,
        $18
      )
      ON CONFLICT (visita_id) DO UPDATE
      SET
        nivel_combustible = EXCLUDED.nivel_combustible,
        exteriores = EXCLUDED.exteriores,
        interiores = EXCLUDED.interiores,
        accesorios = EXCLUDED.accesorios,
        componentes_mecanicos = EXCLUDED.componentes_mecanicos,
        trabajo_a_realizar = EXCLUDED.trabajo_a_realizar,
        comentarios_cliente = EXCLUDED.comentarios_cliente,
        autoriza_presupuesto_previo = EXCLUDED.autoriza_presupuesto_previo,
        autoriza_sin_presupuesto = EXCLUDED.autoriza_sin_presupuesto,
        autoriza_pruebas = EXCLUDED.autoriza_pruebas,
        acepta_condiciones = EXCLUDED.acepta_condiciones,
        nombre_aceptacion = EXCLUDED.nombre_aceptacion,
        firma_cliente = EXCLUDED.firma_cliente,
        recibido_por = EXCLUDED.recibido_por,
        fecha_recepcion = EXCLUDED.fecha_recepcion,
        danos = EXCLUDED.danos,
        observaciones_danos = EXCLUDED.observaciones_danos,
        fecha_actualizacion = NOW()
      RETURNING id
    `,
    [
      visitaId,
      payload.nivel_combustible,
      JSON.stringify(payload.exteriores || {}),
      JSON.stringify(payload.interiores || {}),
      JSON.stringify(payload.accesorios || {}),
      JSON.stringify(payload.componentes_mecanicos || {}),
      payload.trabajo_a_realizar || null,
      payload.comentarios_cliente || null,
      Boolean(payload.autoriza_presupuesto_previo),
      Boolean(payload.autoriza_sin_presupuesto),
      Boolean(payload.autoriza_pruebas),
      Boolean(payload.acepta_condiciones),
      payload.nombre_aceptacion || null,
      payload.firma_cliente || null,
      payload.recibido_por || null,
      payload.fecha_recepcion || null,
      JSON.stringify(payload.danos || {}),
      payload.observaciones_danos || null
    ]
  );

  return findByVisitaId(visitaId || result.rows[0]?.id);
};

module.exports = {
  findByVisitaId,
  upsertByVisitaId
};

