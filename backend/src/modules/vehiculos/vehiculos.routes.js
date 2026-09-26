const { Router } = require('express');
const { body, param, query } = require('express-validator');
const vehiculosController = require('./vehiculos.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');
const { upload, setUploadFolder } = require('../../middlewares/uploadMiddleware');

const router = Router();

const estadosValidos = ['Activo', 'Inactivo'];
const tiposFoto = ['Vehículo', 'Visita', 'Daño', 'Avance', 'Final', 'VIN', 'Kilometraje', 'Otro'];
const currentYear = new Date().getFullYear() + 1;

const vehiculoCreateValidators = [
  body('cliente_id').isInt({ min: 1 }).withMessage('El cliente es requerido'),
  body('placa').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Placa demasiado larga'),
  body('marca').trim().notEmpty().withMessage('La marca es requerida'),
  body('modelo').trim().notEmpty().withMessage('El modelo es requerido'),
  body('anio').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1900, max: currentYear }).withMessage('Anio invalido'),
  body('color').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Color demasiado largo'),
  body('vin').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('VIN demasiado largo'),
  body('tipo_vehiculo_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Tipo de vehiculo invalido'),
  body('kilometraje_actual').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Kilometraje invalido'),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

const vehiculoUpdateValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID invalido'),
  body('cliente_id').optional().isInt({ min: 1 }).withMessage('cliente_id debe ser entero'),
  body('placa').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Placa demasiado larga'),
  body('marca').optional().trim().notEmpty().withMessage('La marca no puede ir vacia'),
  body('modelo').optional().trim().notEmpty().withMessage('El modelo no puede ir vacio'),
  body('anio').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1900, max: currentYear }).withMessage('Anio invalido'),
  body('color').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }).withMessage('Color demasiado largo'),
  body('vin').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('VIN demasiado largo'),
  body('tipo_vehiculo_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Tipo de vehiculo invalido'),
  body('kilometraje_actual').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Kilometraje invalido'),
  body('observaciones').optional({ nullable: true, checkFalsy: true }).trim(),
  body('estado').optional().isIn(estadosValidos).withMessage('Estado invalido')
];

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  [
    query('estado').optional().isIn(estadosValidos).withMessage('Estado invalido'),
    query('cliente_id').optional().isInt({ min: 1 }).withMessage('cliente_id debe ser entero')
  ],
  validateRequest,
  asyncHandler(vehiculosController.listVehiculos)
);

router.get(
  '/:id/historial',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(vehiculosController.getHistorial)
);

router.post(
  '/:id/fotos',
  setUploadFolder('vehiculos'),
  upload.single('foto'),
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('tipo').optional().isIn(tiposFoto).withMessage('Tipo de foto invalido'),
    body('descripcion').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(vehiculosController.addFoto)
);

router.get(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido')
  ],
  validateRequest,
  asyncHandler(vehiculosController.getVehiculo)
);

router.post(
  '/',
  vehiculoCreateValidators,
  validateRequest,
  asyncHandler(vehiculosController.createVehiculo)
);

router.put(
  '/:id',
  vehiculoUpdateValidators,
  validateRequest,
  asyncHandler(vehiculosController.updateVehiculo)
);

router.patch(
  '/:id/estado',
  [
    param('id').isInt({ min: 1 }).withMessage('ID invalido'),
    body('estado').isIn(estadosValidos).withMessage('Estado invalido')
  ],
  validateRequest,
  asyncHandler(vehiculosController.updateEstado)
);

module.exports = router;
