require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { successResponse } = require('./utils/responses');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const clientesRoutes = require('./modules/clientes/clientes.routes');
const vehiculosRoutes = require('./modules/vehiculos/vehiculos.routes');
const visitasRoutes = require('./modules/visitas/visitas.routes');
const mecanicoRoutes = require('./modules/mecanico/mecanico.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');
const categoriasServicioRoutes = require('./modules/servicios/categoriasServicio.routes');
const inventarioRoutes = require('./modules/inventario/inventario.routes');
const productosRoutes = require('./modules/inventario/productos.routes');
const categoriasProductoRoutes = require('./modules/inventario/categoriasProducto.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const flujosRoutes = require('./modules/flujos/flujos.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const facturasRoutes = require('./modules/facturas/facturas.routes');
const setupSwagger = require('./docs/swagger');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.resolve(process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  fallthrough: false,
  index: false,
  maxAge: '1d'
}));

app.get('/api/health', (req, res) => {
  return successResponse(res, 'API del taller funcionando', {
    service: 'taller-automotriz-api',
    status: 'ok'
  });
});

setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/mecanico', mecanicoRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/categorias-servicio', categoriasServicioRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias-producto', categoriasProductoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/flujos-trabajo', flujosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/facturas', facturasRoutes);

// En produccion el backend tambien sirve el frontend ya compilado (frontend/dist),
// de modo que un solo proceso atiende el API y la web app en el mismo puerto.
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    index: 'index.html',
    maxAge: '1h',
    // index.html no se cachea: asi tras actualizar la app el navegador pide los assets nuevos
    // (sus nombres llevan hash, por eso esos si pueden cachearse).
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Cualquier ruta que no sea del API ni de uploads devuelve la SPA.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    return res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
