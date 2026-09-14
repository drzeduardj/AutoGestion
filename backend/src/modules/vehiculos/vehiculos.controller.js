const vehiculosModel = require('./vehiculos.model');
const { successResponse, errorResponse } = require('../../utils/responses');
const { cleanupUploadedFile } = require('../../middlewares/uploadMiddleware');

const normalizeNullableString = (value, uppercase = false) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  return uppercase ? trimmed.toUpperCase() : trimmed;
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

const buildVehiculoPayload = (body, partial = false) => {
  const fields = {};

  const assign = (field, value) => {
    if (!partial || body[field] !== undefined) {
      fields[field] = value;
    }
  };

  assign('cliente_id', normalizeNullableNumber(body.cliente_id));
  assign('placa', normalizeNullableString(body.placa, true));
  assign('marca', body.marca !== undefined ? String(body.marca).trim() : undefined);
  assign('modelo', body.modelo !== undefined ? String(body.modelo).trim() : undefined);
  assign('anio', normalizeNullableNumber(body.anio));
  assign('color', normalizeNullableString(body.color));
  assign('vin', normalizeNullableString(body.vin, true));
  assign('tipo_vehiculo', normalizeNullableString(body.tipo_vehiculo));
  assign('kilometraje_actual', normalizeNullableNumber(body.kilometraje_actual));
  assign('observaciones', normalizeNullableString(body.observaciones));
  assign('estado', body.estado !== undefined ? String(body.estado).trim() : undefined);

  return fields;
};

const mapDatabaseError = (error, res) => {
  if (error.code === '23505') {
    return errorResponse(res, 'Ya existe un vehiculo con esa placa o VIN', error.detail, 409);
  }

  if (error.code === '23503') {
    return errorResponse(res, 'El cliente indicado no existe', error.detail, 400);
  }

  throw error;
};

const ensureClienteActivo = async (clienteId, res) => {
  const exists = await vehiculosModel.clienteExists(clienteId);

  if (!exists) {
    errorResponse(res, 'El cliente indicado no existe o esta inactivo', undefined, 400);
    return false;
  }

  return true;
};

const listVehiculos = async (req, res) => {
  const vehiculos = await vehiculosModel.list({
    search: req.query.search,
    estado: req.query.estado,
    clienteId: req.query.cliente_id
  });

  return successResponse(res, 'Vehiculos obtenidos correctamente', {
    vehiculos
  });
};

const getVehiculo = async (req, res) => {
  const vehiculo = await vehiculosModel.findById(Number(req.params.id));

  if (!vehiculo) {
    return errorResponse(res, 'Vehiculo no encontrado', undefined, 404);
  }

  const fotos = await vehiculosModel.getFotos(vehiculo.id);

  return successResponse(res, 'Vehiculo obtenido correctamente', {
    vehiculo,
    fotos
  });
};

const createVehiculo = async (req, res) => {
  try {
    const payload = buildVehiculoPayload(req.body);

    if (!(await ensureClienteActivo(payload.cliente_id, res))) {
      return undefined;
    }

    const vehiculo = await vehiculosModel.create(payload);

    return successResponse(res, 'Vehiculo creado correctamente', { vehiculo }, 201);
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateVehiculo = async (req, res) => {
  try {
    const payload = buildVehiculoPayload(req.body, true);

    if (payload.cliente_id !== undefined && !(await ensureClienteActivo(payload.cliente_id, res))) {
      return undefined;
    }

    const vehiculo = await vehiculosModel.update(Number(req.params.id), payload);

    if (!vehiculo) {
      return errorResponse(res, 'Vehiculo no encontrado', undefined, 404);
    }

    return successResponse(res, 'Vehiculo actualizado correctamente', { vehiculo });
  } catch (error) {
    return mapDatabaseError(error, res);
  }
};

const updateEstado = async (req, res) => {
  const vehiculo = await vehiculosModel.updateEstado(Number(req.params.id), req.body.estado);

  if (!vehiculo) {
    return errorResponse(res, 'Vehiculo no encontrado', undefined, 404);
  }

  return successResponse(res, 'Estado de vehiculo actualizado correctamente', { vehiculo });
};

const getHistorial = async (req, res) => {
  const vehiculoId = Number(req.params.id);
  const vehiculo = await vehiculosModel.findById(vehiculoId);

  if (!vehiculo) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Vehiculo no encontrado', undefined, 404);
  }

  const historial = await vehiculosModel.getHistorial(vehiculoId);

  return successResponse(res, 'Historial de vehiculo obtenido correctamente', {
    vehiculo,
    historial
  });
};

const MAX_FOTOS_VEHICULO = 6;

const addFoto = async (req, res) => {
  const vehiculoId = Number(req.params.id);
  const vehiculo = await vehiculosModel.findById(vehiculoId);

  if (!vehiculo) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, 'Vehiculo no encontrado', undefined, 404);
  }

  if (!req.file) {
    return errorResponse(res, 'La foto es requerida', undefined, 400);
  }

  const totalFotos = await vehiculosModel.countFotos(vehiculoId);

  if (totalFotos >= MAX_FOTOS_VEHICULO) {
    cleanupUploadedFile(req.file);
    return errorResponse(res, `Un vehiculo admite un maximo de ${MAX_FOTOS_VEHICULO} fotos`, undefined, 409);
  }

  try {
    const foto = await vehiculosModel.addFoto(vehiculoId, {
      tipo: req.body.tipo || 'Vehículo',
      url_archivo: req.file.url,
      nombre_archivo: req.file.originalname,
      descripcion: normalizeNullableString(req.body.descripcion),
      subido_por: req.user.id
    });
    const fotos = await vehiculosModel.getFotos(vehiculoId);

    return successResponse(res, 'Foto de vehiculo cargada correctamente', {
      foto,
      fotos
    }, 201);
  } catch (error) {
    cleanupUploadedFile(req.file);

    if (error.code === '23514') {
      return errorResponse(res, `Un vehiculo admite un maximo de ${MAX_FOTOS_VEHICULO} fotos`, undefined, 409);
    }

    throw error;
  }
};

module.exports = {
  listVehiculos,
  getVehiculo,
  createVehiculo,
  updateVehiculo,
  updateEstado,
  getHistorial,
  addFoto
};
