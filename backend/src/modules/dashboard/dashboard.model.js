const { query } = require('../../config/db');

const getVisitasActivas = async () => {
  const result = await query(
    `
      SELECT *
      FROM vista_dashboard_visitas_activas
      ORDER BY fecha_ingreso DESC, visita_id DESC
    `
  );

  return result.rows;
};

const getStockBajo = async () => {
  const result = await query(
    `
      SELECT *
      FROM vista_stock_bajo
      ORDER BY nombre ASC
    `
  );

  return result.rows;
};

const getResumenVisitas = async () => {
  const result = await query(
    `
      SELECT
        COUNT(*) FILTER (
          WHERE estado NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)
        )::int AS vehiculos_activos_taller,
        COUNT(*) FILTER (
          WHERE estado IN ('En diagnóstico'::estado_visita, 'Pendiente de aprobación'::estado_visita, 'En proceso'::estado_visita, 'En prueba'::estado_visita)
        )::int AS visitas_en_proceso,
        COUNT(*) FILTER (
          WHERE estado = 'En espera de repuesto'::estado_visita
        )::int AS visitas_en_espera_repuesto,
        COUNT(*) FILTER (
          WHERE estado = 'Finalizado'::estado_visita
        )::int AS finalizadas_pendientes_entrega,
        COUNT(*) FILTER (
          WHERE estado = 'Recibido'::estado_visita
        )::int AS visitas_recibidas,
        COUNT(*) FILTER (
          WHERE estado = 'Entregado'::estado_visita
        )::int AS visitas_entregadas,
        COUNT(*) FILTER (
          WHERE estado = 'Cancelado'::estado_visita
        )::int AS visitas_canceladas,
        COUNT(*)::int AS total_visitas
      FROM visitas
    `
  );

  return result.rows[0];
};

const getResumenInventario = async () => {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_productos,
        COUNT(*) FILTER (WHERE estado = 'Activo'::estado_general)::int AS productos_activos,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo)::int AS productos_stock_bajo,
        COALESCE(SUM(stock_actual * COALESCE(costo_promedio, 0)), 0)::numeric(14, 2) AS valor_inventario_costo,
        COALESCE(SUM(stock_actual * COALESCE(precio_referencia, 0)), 0)::numeric(14, 2) AS valor_inventario_referencia
      FROM productos
    `
  );

  return result.rows[0];
};

const getVisitasPorEstado = async () => {
  const result = await query(
    `
      SELECT
        estado,
        COUNT(*)::int AS total
      FROM visitas
      GROUP BY estado
      ORDER BY estado ASC
    `
  );

  return result.rows;
};

const getIngresosRecientes = async (limit = 10) => {
  const result = await query(
    `
      SELECT *
      FROM vista_dashboard_visitas_activas
      ORDER BY fecha_ingreso DESC, visita_id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

const getProgresoVisitas = async (limit = 20) => {
  const result = await query(
    `
      WITH base AS (
        SELECT *
        FROM vista_progreso_visitas
        WHERE estado_visita NOT IN ('Entregado'::estado_visita, 'Cancelado'::estado_visita)
        ORDER BY alerta_sin_avance DESC, fecha_ultima_actividad ASC, visita_id DESC
        LIMIT $1
      )
      SELECT
        b.*,
        (
          SELECT f.numero
          FROM facturas f
          WHERE f.visita_id = b.visita_id
          ORDER BY f.id DESC
          LIMIT 1
        ) AS factura_numero,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ve.id,
                'nombre_etapa', ve.nombre_etapa,
                'orden', ve.orden,
                'estado', ve.estado,
                'fecha_inicio', ve.fecha_inicio,
                'fecha_fin', ve.fecha_fin,
                'observaciones', ve.observaciones
              )
              ORDER BY ve.orden ASC, ve.id ASC
            )
            FROM visita_etapas ve
            WHERE ve.visita_id = b.visita_id
          ),
          '[]'::json
        ) AS etapas,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', vf.id,
                'url_archivo', vf.url_archivo,
                'descripcion', vf.descripcion,
                'fecha_creacion', vf.fecha_creacion,
                'etapa_id', vf.visita_etapa_id,
                'etapa_nombre', vfe.nombre_etapa
              )
              ORDER BY vf.fecha_creacion ASC, vf.id ASC
            )
            FROM visita_fotos vf
            LEFT JOIN visita_etapas vfe ON vfe.id = vf.visita_etapa_id
            WHERE vf.visita_id = b.visita_id
              AND vf.tipo = 'Avance'::tipo_foto
          ),
          '[]'::json
        ) AS fotos_avance
      FROM base b
      ORDER BY b.alerta_sin_avance DESC, b.fecha_ultima_actividad ASC, b.visita_id DESC
    `,
    [limit]
  );

  return result.rows;
};

module.exports = {
  getVisitasActivas,
  getStockBajo,
  getResumenVisitas,
  getResumenInventario,
  getVisitasPorEstado,
  getIngresosRecientes,
  getProgresoVisitas
};
