const recepcionesModel = require('./recepciones.model');
const visitasModel = require('./visitas.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return Number(value);
};

const normalizeChecklist = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, itemValue]) => {
    const normalizedKey = String(key).trim();
    if (!normalizedKey) return acc;
    acc[normalizedKey] = Boolean(itemValue);
    return acc;
  }, {});
};

// Codigos de dano del diagrama de carroceria (ver frontend/src/constants/recepcion.js).
const TIPOS_DANO = ['G', 'R', 'P', 'Q', 'O'];

const normalizeDanos = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [zona, dano]) => {
    const zonaKey = String(zona).trim().slice(0, 60);
    if (!zonaKey || !dano || typeof dano !== 'object') return acc;

    const tipos = Array.isArray(dano.tipos)
      ? [...new Set(dano.tipos.map(String))].filter((tipo) => TIPOS_DANO.includes(tipo))
      : [];
    const nota = normalizeNullableString(dano.nota)?.slice(0, 255) || null;

    // Una zona sin tipo ni nota equivale a "sin dano": no se guarda.
    if (tipos.length || nota) {
      acc[zonaKey] = { tipos, nota };
    }
    return acc;
  }, {});
};

const buildPayload = (body, user) => ({
  nivel_combustible: normalizeNullableNumber(body.nivel_combustible),
  exteriores: normalizeChecklist(body.exteriores),
  interiores: normalizeChecklist(body.interiores),
  accesorios: normalizeChecklist(body.accesorios),
  componentes_mecanicos: normalizeChecklist(body.componentes_mecanicos),
  trabajo_a_realizar: normalizeNullableString(body.trabajo_a_realizar),
  comentarios_cliente: normalizeNullableString(body.comentarios_cliente),
  autoriza_presupuesto_previo: body.autoriza_presupuesto_previo === true,
  autoriza_sin_presupuesto: body.autoriza_sin_presupuesto === true,
  autoriza_pruebas: body.autoriza_pruebas === true,
  acepta_condiciones: body.acepta_condiciones === true,
  nombre_aceptacion: normalizeNullableString(body.nombre_aceptacion),
  firma_cliente: normalizeNullableString(body.firma_cliente),
  recibido_por: normalizeNullableNumber(body.recibido_por) || user?.id,
  fecha_recepcion: normalizeNullableString(body.fecha_recepcion),
  danos: normalizeDanos(body.danos),
  observaciones_danos: normalizeNullableString(body.observaciones_danos)
});

const getRecepcion = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const recepcion = await recepcionesModel.findByVisitaId(visitaId);

  return successResponse(res, 'Recepcion obtenida correctamente', {
    visita,
    recepcion
  });
};

const saveRecepcion = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const payload = buildPayload(req.body, req.user);
  const recepcion = await recepcionesModel.upsertByVisitaId(visitaId, payload);

  return successResponse(res, 'Recepcion guardada correctamente', {
    visita,
    recepcion
  });
};

module.exports = {
  getRecepcion,
  saveRecepcion
};

