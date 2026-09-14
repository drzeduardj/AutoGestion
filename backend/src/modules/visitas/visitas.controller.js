const visitasModel = require('./visitas.model');
const recepcionesModel = require('./recepciones.model');
const inventarioModel = require('../inventario/inventario.model');
const flujosModel = require('../flujos/flujos.model');
const { successResponse, errorResponse } = require('../../utils/responses');
const { cleanupUploadedFile } = require('../../middlewares/uploadMiddleware');

const normalizeNullableString = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const normalizeNullableNumber = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return Number(value);
};

const buildVisitaPayload = (body, user, partial = false) => {
  const fields = {};
  const assign = (field, value) => {
    if (!partial || body[field] !== undefined) {
      fields[field] = value;
    }
  };

  assign('cliente_id', normalizeNullableNumber(body.cliente_id));
  assign('vehiculo_id', normalizeNullableNumber(body.vehiculo_id));
  assign('recibido_por', normalizeNullableNumber(body.recibido_por) || user?.id);
  assign('mecanico_asignado_id', normalizeNullableNumber(body.mecanico_asignado_id));
  assign('flujo_trabajo_id', normalizeNullableNumber(body.flujo_trabajo_id));
  assign('fecha_entrega_estimada', normalizeNullableString(body.fecha_entrega_estimada));
  assign('fecha_entrega_real', normalizeNullableString(body.fecha_entrega_real));
  assign('kilometraje_ingreso', normalizeNullableNumber(body.kilometraje_ingreso));
  assign('motivo_visita', body.motivo_visita !== undefined ? String(body.motivo_visita).trim() : undefined);
  assign('descripcion_problema', normalizeNullableString(body.descripcion_problema));
  assign('diagnostico', normalizeNullableString(body.diagnostico));
  assign('estado', body.estado !== undefined ? String(body.estado).trim() : undefined);
  assign('observaciones', normalizeNullableString(body.observaciones));

  return fields;
};

const buildServicioAsignadoPayload = (item) => ({
  servicio_id: normalizeNullableNumber(item.servicio_id),
  mecanico_id: normalizeNullableNumber(item.mecanico_id),
  descripcion_adicional: normalizeNullableString(item.descripcion_adicional),
  precio_acordado: normalizeNullableNumber(item.precio_acordado),
  cantidad: normalizeNullableNumber(item.cantidad) ?? 1,
  estado: item.estado !== undefined ? String(item.estado).trim() : undefined,
  observaciones: normalizeNullableString(item.observaciones)
});

const enrichVisita = async (visita) => {
  const [servicios, bitacora, productos, fotos, recepcion] = await Promise.all([
    visitasModel.getServicios(visita.id),
    visitasModel.getBitacora(visita.id),
    inventarioModel.listProductosUsadosByVisita(visita.id),
    visitasModel.getFotos(visita.id),
    recepcionesModel.findByVisitaId(visita.id)
  ]);
  const [etapas, progreso] = await Promise.all([
    visitasModel.getEtapas(visita.id),
    visitasModel.getProgreso(visita.id)
  ]);
  const totalServicios = servicios.reduce((total, servicio) => {
    return total + Number(servicio.subtotal || 0);
  }, 0);

  return {
    visita,
    servicios,
    productos,
    fotos,
    recepcion,
    bitacora,
    etapas,
    progreso,
    totales: {
      servicios: Number(totalServicios.toFixed(2))
    }
  };
};

const validateVisitaRelations = async (payload, res) => {
  const belongs = await visitasModel.vehiculoPerteneceCliente(payload.cliente_id, payload.vehiculo_id);

  if (!belongs) {
    errorResponse(res, 'El vehiculo no existe, esta inactivo o no pertenece al cliente indicado', undefined, 400);
    return false;
  }

  if (payload.mecanico_asignado_id) {
    const mecanicoExists = await visitasModel.usuarioActivo(payload.mecanico_asignado_id, 'Mecanico');

    if (!mecanicoExists) {
      errorResponse(res, 'El mecanico asignado no existe o esta inactivo', undefined, 400);
      return false;
    }
  }

  if (payload.flujo_trabajo_id) {
    const flujoExists = await flujosModel.flujoActivo(payload.flujo_trabajo_id);

    if (!flujoExists) {
      errorResponse(res, 'El flujo de trabajo no existe o esta inactivo', undefined, 400);
      return false;
    }
  }

  return true;
};

const validateServicios = async (servicios, res) => {
  for (const servicio of servicios) {
    const exists = await visitasModel.servicioActivo(servicio.servicio_id);

    if (!exists) {
      errorResponse(res, `El servicio ${servicio.servicio_id} no existe o esta inactivo`, undefined, 400);
      return false;
    }

    if (servicio.mecanico_id) {
      const mecanicoExists = await visitasModel.usuarioActivo(servicio.mecanico_id, 'Mecanico');

      if (!mecanicoExists) {
        errorResponse(res, `El mecanico ${servicio.mecanico_id} no existe o esta inactivo`, undefined, 400);
        return false;
      }
    }
  }

  return true;
};

const listVisitas = async (req, res) => {
  const visitas = await visitasModel.list({
    search: req.query.search,
    estado: req.query.estado,
    clienteId: req.query.cliente_id,
    vehiculoId: req.query.vehiculo_id,
    mecanicoId: req.query.mecanico_id
  });

  return successResponse(res, 'Visitas obtenidas correctamente', { visitas });
};

const listActivas = async (req, res) => {
  const visitas = await visitasModel.listActivas();

  return successResponse(res, 'Visitas activas obtenidas correctamente', { visitas });
};

const getVisita = async (req, res) => {
  const visita = await visitasModel.findById(Number(req.params.id));

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  return successResponse(res, 'Visita obtenida correctamente', await enrichVisita(visita));
};

const createVisita = async (req, res) => {
  const payload = buildVisitaPayload(req.body, req.user);
  const servicios = (req.body.servicios || []).map(buildServicioAsignadoPayload);

  if (!(await validateVisitaRelations(payload, res))) {
    return undefined;
  }

  if (!(await validateServicios(servicios, res))) {
    return undefined;
  }

  const visita = await visitasModel.create(payload, servicios);

  if (payload.flujo_trabajo_id) {
    await flujosModel.inicializarEtapasVisita({
      visitaId: visita.id,
      flujoTrabajoId: payload.flujo_trabajo_id,
      usuarioId: req.user?.id
    });
  }

  const visitaCreada = await visitasModel.findById(visita.id);

  return successResponse(res, 'Visita creada correctamente', await enrichVisita(visitaCreada), 201);
};

const updateVisita = async (req, res) => {
  const payload = buildVisitaPayload(req.body, req.user, true);

  if (payload.mecanico_asignado_id) {
    const mecanicoExists = await visitasModel.usuarioActivo(payload.mecanico_asignado_id, 'Mecanico');

    if (!mecanicoExists) {
      return errorResponse(res, 'El mecanico asignado no existe o esta inactivo', undefined, 400);
    }
  }

  if (payload.flujo_trabajo_id) {
    const flujoExists = await flujosModel.flujoActivo(payload.flujo_trabajo_id);

    if (!flujoExists) {
      return errorResponse(res, 'El flujo de trabajo no existe o esta inactivo', undefined, 400);
    }
  }

  const visita = await visitasModel.update(Number(req.params.id), payload);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  if (payload.flujo_trabajo_id) {
    await flujosModel.inicializarEtapasVisita({
      visitaId: visita.id,
      flujoTrabajoId: payload.flujo_trabajo_id,
      usuarioId: req.user?.id,
      replace: true
    });
  }

  const visitaActualizada = await visitasModel.findById(visita.id);

  return successResponse(res, 'Visita actualizada correctamente', await enrichVisita(visitaActualizada));
};

const updateEstado = async (req, res) => {
  const visita = await visitasModel.updateEstado(Number(req.params.id), {
    estado: req.body.estado,
    observaciones: normalizeNullableString(req.body.observaciones)
  });

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  return successResponse(res, 'Estado de visita actualizado correctamente', await enrichVisita(visita));
};

const addServicios = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const servicios = req.body.servicios
    ? req.body.servicios.map(buildServicioAsignadoPayload)
    : [buildServicioAsignadoPayload(req.body)];

  if (!(await validateServicios(servicios, res))) {
    return undefined;
  }

  const serviciosAsignados = await visitasModel.addServicios(visitaId, servicios);

  return successResponse(res, 'Servicios asignados correctamente', {
    servicios: serviciosAsignados
  }, 201);
};

const getBitacora = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const bitacora = await visitasModel.getBitacora(visitaId);

  return successResponse(res, 'Bitacora de visita obtenida correctamente', {
    visita,
    bitacora
  });
};

const getEtapas = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const [etapas, progreso] = await Promise.all([
    visitasModel.getEtapas(visitaId),
    visitasModel.getProgreso(visitaId)
  ]);

  return successResponse(res, 'Etapas de visita obtenidas correctamente', {
    visita,
    etapas,
    progreso
  });
};

const inicializarEtapas = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const flujoTrabajoId = normalizeNullableNumber(req.body.flujo_trabajo_id || visita.flujo_trabajo_id);

  if (!flujoTrabajoId) {
    return errorResponse(res, 'flujo_trabajo_id es requerido', undefined, 400);
  }

  const flujoExists = await flujosModel.flujoActivo(flujoTrabajoId);

  if (!flujoExists) {
    return errorResponse(res, 'El flujo de trabajo no existe o esta inactivo', undefined, 400);
  }

  await flujosModel.inicializarEtapasVisita({
    visitaId,
    flujoTrabajoId,
    usuarioId: req.user?.id,
    replace: req.body.replace !== false
  });

  const [etapas, progreso] = await Promise.all([
    visitasModel.getEtapas(visitaId),
    visitasModel.getProgreso(visitaId)
  ]);

  return successResponse(res, 'Etapas inicializadas correctamente', {
    etapas,
    progreso
  });
};

const updateEtapa = async (req, res) => {
  const visitaId = Number(req.params.id);
  const etapaId = Number(req.params.etapaId);
  const etapa = await visitasModel.updateEtapa(visitaId, etapaId, {
    estado: req.body.estado,
    observaciones: normalizeNullableString(req.body.observaciones),
    usuarioId: req.user?.id
  });

  if (!etapa) {
    return errorResponse(res, 'Etapa no encontrada', undefined, 404);
  }

  const [etapas, progreso] = await Promise.all([
    visitasModel.getEtapas(visitaId),
    visitasModel.getProgreso(visitaId)
  ]);

  return successResponse(res, 'Etapa actualizada correctamente', {
    etapa,
    etapas,
    progreso
  });
};

const addProductoUsado = async (req, res) => {
  try {
    const visitaId = Number(req.params.id);
    const visita = await visitasModel.findById(visitaId);

    if (!visita) {
      return errorResponse(res, 'Visita no encontrada', undefined, 404);
    }

    const productoId = Number(req.body.producto_id);
    const productoActivo = await inventarioModel.productoActivo(productoId);

    if (!productoActivo) {
      return errorResponse(res, 'El producto indicado no existe o esta inactivo', undefined, 400);
    }

    const productoUsado = await inventarioModel.registrarProductoUsado({
      visitaId,
      productoId,
      usuarioId: req.user.id,
      cantidad: Number(req.body.cantidad),
      observaciones: normalizeNullableString(req.body.observaciones)
    });
    const productos = await inventarioModel.listProductosUsadosByVisita(visitaId);
    const producto = await inventarioModel.findProductoById(productoId);

    return successResponse(res, 'Producto usado registrado correctamente', {
      producto_usado: productoUsado,
      productos,
      producto
    }, 201);
  } catch (error) {
    if (error.message?.includes('Stock insuficiente')) {
      return errorResponse(res, error.message, undefined, 400);
    }

    throw error;
  }
};

const addFoto = async (req, res) => {
  const visitaId = Number(req.params.id);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  if (!req.file) {
    return errorResponse(res, 'La foto es requerida', undefined, 400);
  }

  const foto = await visitasModel.addFoto(visitaId, {
    tipo: req.body.tipo || 'Visita',
    url_archivo: req.file.url,
    nombre_archivo: req.file.originalname,
    descripcion: normalizeNullableString(req.body.descripcion),
    subido_por: req.user.id
  });
  const fotos = await visitasModel.getFotos(visitaId);

  return successResponse(res, 'Foto de visita cargada correctamente', {
    foto,
    fotos
  }, 201);
};

module.exports = {
  listVisitas,
  listActivas,
  getVisita,
  createVisita,
  updateVisita,
  updateEstado,
  addServicios,
  getBitacora,
  getEtapas,
  inicializarEtapas,
  updateEtapa,
  addProductoUsado,
  addFoto
};
