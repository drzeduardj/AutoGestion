const mecanicoModel = require('./mecanico.model');
const visitasModel = require('../visitas/visitas.model');
const inventarioModel = require('../inventario/inventario.model');
const notificacionesModel = require('../notificaciones/notificaciones.model');
const { successResponse, errorResponse } = require('../../utils/responses');
const { cleanupUploadedFile } = require('../../middlewares/uploadMiddleware');

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
};

const enrichTrabajo = async (trabajo) => {
  const [servicios, productos, items, fotos, bitacora, etapas, progreso] = await Promise.all([
    visitasModel.getServicios(trabajo.id),
    inventarioModel.listProductosUsadosByVisita(trabajo.id),
    visitasModel.getItems(trabajo.id),
    visitasModel.getFotos(trabajo.id),
    visitasModel.getBitacora(trabajo.id),
    visitasModel.getEtapas(trabajo.id),
    visitasModel.getProgreso(trabajo.id)
  ]);

  return {
    visita: trabajo,
    servicios,
    productos,
    items,
    fotos,
    bitacora,
    etapas,
    progreso
  };
};

const listMisTrabajos = async (req, res) => {
  const trabajos = await mecanicoModel.listMisTrabajos(req.user.id, {
    estado: req.query.estado,
    activas: req.query.activas !== 'false'
  });

  return successResponse(res, 'Trabajos asignados obtenidos correctamente', {
    trabajos
  });
};

const getMiTrabajo = async (req, res) => {
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, Number(req.params.id));

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  return successResponse(res, 'Trabajo asignado obtenido correctamente', await enrichTrabajo(trabajo));
};

const updateEstado = async (req, res) => {
  const trabajo = await mecanicoModel.updateEstado(req.user.id, Number(req.params.id), {
    estado: req.body.estado,
    observaciones: normalizeNullableString(req.body.observaciones),
    diagnostico: normalizeNullableString(req.body.diagnostico)
  });

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  if (req.body.estado === 'Finalizado') {
    await notificacionesModel.notifyTrabajoFinalizado(trabajo);
  }

  return successResponse(res, 'Estado de trabajo actualizado correctamente', await enrichTrabajo(trabajo));
};

const addProductoUsado = async (req, res) => {
  try {
    const visitaId = Number(req.params.id);
    const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

    if (!trabajo) {
      return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
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

const updateEtapa = async (req, res) => {
  const visitaId = Number(req.params.id);
  const etapaId = Number(req.params.etapaId);
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  const etapa = await visitasModel.updateEtapa(visitaId, etapaId, {
    estado: req.body.estado,
    observaciones: normalizeNullableString(req.body.observaciones),
    usuarioId: req.user.id
  });

  if (!etapa) {
    return errorResponse(res, 'Etapa no encontrada', undefined, 404);
  }

  const trabajoActualizado = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  return successResponse(res, 'Etapa actualizada correctamente', await enrichTrabajo(trabajoActualizado));
};

const addFoto = async (req, res) => {
  const visitaId = Number(req.params.id);
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  if (!trabajo) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  if (!req.file) {
    return errorResponse(res, 'La foto es requerida', undefined, 400);
  }

  const etapaEnProcesoId = await visitasModel.findEtapaEnProcesoId(visitaId);

  const foto = await visitasModel.addFoto(visitaId, {
    tipo: req.body.tipo || 'Avance',
    url_archivo: req.file.url,
    nombre_archivo: req.file.originalname,
    descripcion: normalizeNullableString(req.body.descripcion),
    subido_por: req.user.id,
    visita_etapa_id: etapaEnProcesoId
  });
  const fotos = await visitasModel.getFotos(visitaId);

  return successResponse(res, 'Foto de avance cargada correctamente', {
    foto,
    fotos
  }, 201);
};

const addItem = async (req, res) => {
  const visitaId = Number(req.params.id);
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  await visitasModel.addItem(visitaId, {
    tipo: req.body.tipo,
    descripcion: normalizeNullableString(req.body.descripcion),
    cantidad: Number(req.body.cantidad),
    precio_sugerido: Number(req.body.precio_sugerido),
    usuario_id: req.user.id
  });

  const items = await visitasModel.getItems(visitaId);

  return successResponse(res, 'Item agregado correctamente', { items }, 201);
};

const deleteItem = async (req, res) => {
  const visitaId = Number(req.params.id);
  const trabajo = await mecanicoModel.findTrabajoById(req.user.id, visitaId);

  if (!trabajo) {
    return errorResponse(res, 'Trabajo no encontrado o no asignado a este mecanico', undefined, 404);
  }

  const eliminado = await visitasModel.deleteItem(visitaId, Number(req.params.itemId));

  if (!eliminado) {
    return errorResponse(res, 'Item no encontrado', undefined, 404);
  }

  const items = await visitasModel.getItems(visitaId);

  return successResponse(res, 'Item eliminado correctamente', { items });
};

module.exports = {
  listMisTrabajos,
  getMiTrabajo,
  updateEstado,
  updateEtapa,
  addProductoUsado,
  addItem,
  deleteItem,
  addFoto
};
