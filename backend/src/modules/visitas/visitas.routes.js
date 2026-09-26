const { Router } = require('express');
const { body, param, query } = require('express-validator');
const visitasController = require('./visitas.controller');
const recepcionesController = require('./recepciones.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { upload, setUploadFolder } = require('../../middlewares/uploadMiddleware');

const router = Router();

const estadosVisita = [
  'Recibido',
  'En diagnóstico',
  'Pendiente de aprobación',
  'En proceso',
  'En espera de repuesto',
  'En prueba',
  'Finalizado',
  'Entregado',
  'Cancelado'
];
const estadosEtapa = ['Pendiente', 'En proceso', 'Completado', 'Omitido'];
const tiposFoto = ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'];

const visitaCreateValidators = [
  body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id es requerido'),
  body('vehiculo_id').isInt({ min: 1 }).withMessage('vehiculo_id es requerido'),
  body('mecanico_asignado_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('mecanico_asignado_id debe ser entero'),
  body('flujo_trabajo_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('flujo_trabajo_id debe ser entero'),
  body('fecha_entrega_estimada').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('fecha_entrega_estimada invalida'),
  body('kilometraje_ingreso').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Kilometraje invalido'),
  body('motivo_visita').trim().notEmpty().withMessage('motivo_visita es requerido'),
  body('descripcion_problema').optional({ nullable: true, checkFalsy: true }).trim(),
  body('diagnostico').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosVisita).withMessage('Estado invalido'),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
  body('servicios').optional().isArray().withMessage('servicios debe ser un arreglo'),
  body('servicios').optional().custom((servicios) => servicios.every((servicio) => servicio.servicio_id)).withMessage('Cada servicio asignado requiere servicio_id'),
  body('servicios.*.servicio_id').optional().isInt({ min: 1 }).withMessage('servicio_id es requerido'),
  body('servicios.*.mecanico_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('mecanico_id debe ser entero'),
  body('servicios.*.precio_acordado').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('precio_acordado debe ser mayor o igual a 0'),
  body('servicios.*.cantidad').optional({ nullable: true, checkFalsy: true }).isFloat({ gt: 0 }).withMessage('cantidad debe ser mayor que 0'),
  body('servicios.*.estado').optional().isIn(estadosVisita).withMessage('Estado de servicio invalido')
];

const visitaUpdateValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('mecanico_asignado_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('mecanico_asignado_id debe ser entero'),
  body('flujo_trabajo_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('flujo_trabajo_id debe ser entero'),
  body('fecha_entrega_estimada').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('fecha_entrega_estimada invalida'),
  body('fecha_entrega_real').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('fecha_entrega_real invalida'),
  body('kilometraje_ingreso').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Kilometraje invalido'),
  body('motivo_visita').optional().trim().notEmpty().withMessage('motivo_visita no puede ir vacio'),
  body('descripcion_problema').optional({ nullable: true, checkFalsy: true }).trim(),
  body('diagnostico').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosVisita).withMessage('Estado invalido'),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosVisita).withMessage('Estado invalido'),
    query('cliente_id').optional().isInt({ min: 1 }).withMessage('cliente_id debe ser entero'),
    query('vehiculo_id').optional().isInt({ min: 1 }).withMessage('vehiculo_id debe ser entero'),
    query('mecanico_id').optional().isInt({ min: 1 }).withMessage('mecanico_id debe ser entero')
  ],
  validateRequest,
  asyncHandler(visitasController.listVisitas)
);

router.get(
  '/activas',
  asyncHandler(visitasController.listActivas)
);

router.get(
  '/:id/bitacora',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(visitasController.getBitacora)
);

router.get(
  '/:id/etapas',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(visitasController.getEtapas)
);

router.get(
  '/:id/recepcion',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(recepcionesController.getRecepcion)
);

router.get(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(visitasController.getVisita)
);

router.post(
  '/',
  visitaCreateValidators,
  validateRequest,
  asyncHandler(visitasController.createVisita)
);

router.put(
  '/:id',
  visitaUpdateValidators,
  validateRequest,
  asyncHandler(visitasController.updateVisita)
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosVisita).withMessage('Estado invalido'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(visitasController.updateEstado)
);

router.put(
  '/:id/recepcion',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('nivel_combustible').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0, max: 100 }).withMessage('nivel_combustible debe estar entre 0 y 100'),
    body('exteriores').optional().isObject().withMessage('exteriores debe ser un objeto'),
    body('interiores').optional().isObject().withMessage('interiores debe ser un objeto'),
    body('accesorios').optional().isObject().withMessage('accesorios debe ser un objeto'),
    body('componentes_mecanicos').optional().isObject().withMessage('componentes_mecanicos debe ser un objeto'),
    body('danos').optional().isObject().withMessage('danos debe ser un objeto'),
    body('observaciones_danos').optional({ nullable: true, checkFalsy: true }).trim(),
    body('trabajo_a_realizar').optional({ nullable: true, checkFalsy: true }).trim(),
    body('comentarios_cliente').optional({ nullable: true, checkFalsy: true }).trim(),
    body('autoriza_presupuesto_previo').optional().isBoolean().withMessage('autoriza_presupuesto_previo debe ser booleano'),
    body('autoriza_sin_presupuesto').optional().isBoolean().withMessage('autoriza_sin_presupuesto debe ser booleano'),
    body('autoriza_pruebas').optional().isBoolean().withMessage('autoriza_pruebas debe ser booleano'),
    body('acepta_condiciones').optional().isBoolean().withMessage('acepta_condiciones debe ser booleano'),
    body('nombre_aceptacion').optional({ nullable: true, checkFalsy: true }).isLength({ max: 150 }).withMessage('nombre_aceptacion no puede superar 150 caracteres'),
    body('firma_cliente').optional({ nullable: true, checkFalsy: true }).trim(),
    body('recibido_por').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('recibido_por debe ser entero'),
    body('fecha_recepcion').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('fecha_recepcion invalida')
  ],
  validateRequest,
  asyncHandler(recepcionesController.saveRecepcion)
);

router.post(
  '/:id/etapas/inicializar',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('flujo_trabajo_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('flujo_trabajo_id debe ser entero'),
    body('replace').optional().isBoolean().withMessage('replace debe ser booleano')
  ],
  validateRequest,
  asyncHandler(visitasController.inicializarEtapas)
);

router.patch(
  '/:id/etapas/:etapaId',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    param('etapaId').isInt({ min: 1 }).withMessage('ID de etapa invalido'),
    body('estado').isIn(estadosEtapa).withMessage('Estado de etapa invalido'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(visitasController.updateEtapa)
);

router.post(
  '/:id/servicios',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('servicios').optional().isArray({ min: 1 }).withMessage('servicios debe ser un arreglo con al menos un elemento'),
    body('servicios').optional().custom((servicios) => servicios.every((servicio) => servicio.servicio_id)).withMessage('Cada servicio asignado requiere servicio_id'),
    body('servicio_id').if(body('servicios').not().exists()).isInt({ min: 1 }).withMessage('servicio_id es requerido'),
    body('mecanico_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('mecanico_id debe ser entero'),
    body('descripcion_adicional').optional({ nullable: true, checkFalsy: true }).trim(),
    body('precio_acordado').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('precio_acordado debe ser mayor o igual a 0'),
    body('cantidad').optional({ nullable: true, checkFalsy: true }).isFloat({ gt: 0 }).withMessage('cantidad debe ser mayor que 0'),
    body('estado').optional().isIn(estadosVisita).withMessage('Estado de servicio invalido'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
    body('servicios.*.servicio_id').optional().isInt({ min: 1 }).withMessage('servicio_id es requerido'),
    body('servicios.*.mecanico_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('mecanico_id debe ser entero'),
    body('servicios.*.precio_acordado').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('precio_acordado debe ser mayor o igual a 0'),
    body('servicios.*.cantidad').optional({ nullable: true, checkFalsy: true }).isFloat({ gt: 0 }).withMessage('cantidad debe ser mayor que 0'),
    body('servicios.*.estado').optional().isIn(estadosVisita).withMessage('Estado de servicio invalido')
  ],
  validateRequest,
  asyncHandler(visitasController.addServicios)
);

router.post(
  '/:id/productos',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('producto_id').isInt({ min: 1 }).withMessage('producto_id es requerido'),
    body('cantidad').isFloat({ gt: 0 }).withMessage('cantidad debe ser mayor que 0'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(visitasController.addProductoUsado)
);

router.post(
  '/:id/fotos',
  setUploadFolder('visitas'),
  upload.single('foto'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('tipo').optional().isIn(tiposFoto).withMessage('Tipo de foto invalido'),
    body('descripcion').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(visitasController.addFoto)
);

module.exports = router;
