const facturasModel = require('./facturas.model');
const visitasModel = require('../visitas/visitas.model');
const inventarioModel = require('../inventario/inventario.model');
const { successResponse, errorResponse } = require('../../utils/responses');

const normalizeNullableString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

// Construye las lineas propuestas a partir de los servicios y productos ya registrados.
const buildBorrador = async (visitaId) => {
  const [servicios, productos, items] = await Promise.all([
    visitasModel.getServicios(visitaId),
    inventarioModel.listProductosUsadosByVisita(visitaId),
    visitasModel.getItems(visitaId)
  ]);

  const lineasServicios = servicios.map((s) => ({
    tipo: 'Servicio',
    descripcion: [s.servicio_nombre, s.descripcion_adicional].filter(Boolean).join(' - '),
    cantidad: Number(s.cantidad) || 1,
    precio_unitario: Number(s.precio_acordado) || 0
  }));

  const lineasMateriales = productos.map((p) => ({
    tipo: 'Material',
    descripcion: [p.codigo, p.producto_nombre, p.producto_marca].filter(Boolean).join(' - '),
    cantidad: Number(p.cantidad) || 1,
    precio_unitario: Number(p.precio_referencia) || 0
  }));

  // Lineas manuales que el mecanico agrego (servicio o material fuera de catalogo).
  const lineasItems = items.map((it) => ({
    tipo: it.tipo === 'Material' ? 'Material' : 'Servicio',
    descripcion: it.descripcion,
    cantidad: Number(it.cantidad) || 1,
    precio_unitario: Number(it.precio_sugerido) || 0
  }));

  return [...lineasServicios, ...lineasItems, ...lineasMateriales];
};

const listFacturas = async (req, res) => {
  const facturas = await facturasModel.list({ search: req.query.search });
  return successResponse(res, 'Facturas obtenidas correctamente', { facturas });
};

const getResumen = async (req, res) => {
  const visitaId = Number(req.params.visitaId);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const facturaExistente = await facturasModel.findByVisitaId(visitaId);
  const borrador = facturaExistente ? [] : await buildBorrador(visitaId);

  return successResponse(res, 'Resumen de cobro obtenido correctamente', {
    visita,
    factura: facturaExistente,
    borrador
  });
};

const emitir = async (req, res) => {
  const visitaId = Number(req.params.visitaId);
  const visita = await visitasModel.findById(visitaId);

  if (!visita) {
    return errorResponse(res, 'Visita no encontrada', undefined, 404);
  }

  const existente = await facturasModel.findByVisitaId(visitaId);
  if (existente) {
    return errorResponse(res, `Esta visita ya tiene una factura emitida (${existente.numero})`, undefined, 409);
  }

  const lineas = Array.isArray(req.body.lineas) ? req.body.lineas : [];
  const lineasValidas = lineas
    .map((linea) => ({
      tipo: linea.tipo === 'Material' ? 'Material' : 'Servicio',
      descripcion: normalizeNullableString(linea.descripcion),
      cantidad: Number(linea.cantidad),
      precio_unitario: Number(linea.precio_unitario)
    }))
    .filter((linea) => linea.descripcion && Number.isFinite(linea.cantidad) && linea.cantidad > 0 && Number.isFinite(linea.precio_unitario) && linea.precio_unitario >= 0);

  if (!lineasValidas.length) {
    return errorResponse(res, 'Agrega al menos una linea valida para emitir la factura', undefined, 400);
  }

  const factura = await facturasModel.create(visitaId, {
    lineas: lineasValidas,
    observaciones: normalizeNullableString(req.body.observaciones),
    emitidaPor: req.user.id
  });

  return successResponse(res, 'Factura emitida correctamente', { factura }, 201);
};

const emitirVenta = async (req, res) => {
  const lineas = Array.isArray(req.body.lineas) ? req.body.lineas : [];
  const lineasValidas = lineas
    .map((linea) => ({
      tipo: linea.tipo === 'Material' ? 'Material' : 'Servicio',
      descripcion: normalizeNullableString(linea.descripcion),
      cantidad: Number(linea.cantidad),
      precio_unitario: Number(linea.precio_unitario),
      producto_id: linea.producto_id ? Number(linea.producto_id) : null
    }))
    .filter((linea) => linea.descripcion && Number.isFinite(linea.cantidad) && linea.cantidad > 0 && Number.isFinite(linea.precio_unitario) && linea.precio_unitario >= 0);

  if (!lineasValidas.length) {
    return errorResponse(res, 'Agrega al menos una linea valida para emitir la factura', undefined, 400);
  }

  try {
    const factura = await facturasModel.createVenta({
      clienteNombre: normalizeNullableString(req.body.cliente_nombre),
      lineas: lineasValidas,
      observaciones: normalizeNullableString(req.body.observaciones),
      emitidaPor: req.user.id
    });

    return successResponse(res, 'Factura de venta emitida correctamente', { factura }, 201);
  } catch (error) {
    if (error.message?.includes('Stock insuficiente')) {
      return errorResponse(res, error.message, undefined, 400);
    }
    throw error;
  }
};

const getFactura = async (req, res) => {
  const factura = await facturasModel.findById(Number(req.params.id));

  if (!factura) {
    return errorResponse(res, 'Factura no encontrada', undefined, 404);
  }

  const visita = await visitasModel.findById(factura.visita_id);

  return successResponse(res, 'Factura obtenida correctamente', { factura, visita });
};

module.exports = {
  listFacturas,
  getResumen,
  emitir,
  emitirVenta,
  getFactura
};
