const { Router } = require('express');
const { body, param } = require('express-validator');
const facturasController = require('./facturas.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');
const validateRequest = require('../../middlewares/validateRequest');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get(
  '/',
  asyncHandler(facturasController.listFacturas)
);

router.get(
  '/resumen/:visitaId',
  [param('visitaId').isInt({ min: 1 }).withMessage('ID de visita invalido')],
  validateRequest,
  asyncHandler(facturasController.getResumen)
);

router.post(
  '/visitas/:visitaId',
  [
    param('visitaId').isInt({ min: 1 }).withMessage('ID de visita invalido'),
    body('lineas').isArray({ min: 1 }).withMessage('Se requiere al menos una linea'),
    body('lineas.*.tipo').optional().isIn(['Servicio', 'Material']).withMessage('Tipo de linea invalido'),
    body('lineas.*.descripcion').trim().notEmpty().withMessage('Cada linea requiere descripcion'),
    body('lineas.*.cantidad').isFloat({ gt: 0 }).withMessage('Cantidad debe ser mayor que 0'),
    body('lineas.*.precio_unitario').isFloat({ min: 0 }).withMessage('Precio debe ser mayor o igual a 0'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(facturasController.emitir)
);

router.post(
  '/venta',
  [
    body('lineas').isArray({ min: 1 }).withMessage('Se requiere al menos una linea'),
    body('lineas.*.tipo').optional().isIn(['Servicio', 'Material']).withMessage('Tipo de linea invalido'),
    body('lineas.*.descripcion').trim().notEmpty().withMessage('Cada linea requiere descripcion'),
    body('lineas.*.cantidad').isFloat({ gt: 0 }).withMessage('Cantidad debe ser mayor que 0'),
    body('lineas.*.precio_unitario').isFloat({ min: 0 }).withMessage('Precio debe ser mayor o igual a 0'),
    body('lineas.*.producto_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('producto_id invalido'),
    body('cliente_nombre').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }).withMessage('Nombre demasiado largo'),
    body('observaciones').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validateRequest,
  asyncHandler(facturasController.emitirVenta)
);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('ID invalido')],
  validateRequest,
  asyncHandler(facturasController.getFactura)
);

module.exports = router;
