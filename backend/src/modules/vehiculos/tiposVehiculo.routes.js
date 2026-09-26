const { Router } = require('express');
const vehiculosController = require('./vehiculos.controller');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/authMiddleware');
const roleMiddleware = require('../../middlewares/roleMiddleware');

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware('Admin', 'Cajero'));

router.get('/', asyncHandler(vehiculosController.listTipos));

module.exports = router;
