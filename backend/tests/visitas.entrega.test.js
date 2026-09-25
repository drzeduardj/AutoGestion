const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Reemplaza un modulo en la cache de require para aislar el controlador de la base de datos.
const stubModule = (relativePath, exports) => {
  const id = require.resolve(path.join(__dirname, '..', relativePath));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

let state;
let cambiosEstado;
let updates;

stubModule('src/modules/visitas/visitas.model.js', {
  findById: async (id) => ({ id, estado: state.estadoActual, flujo_trabajo_id: null }),
  tieneFactura: async () => state.tieneFactura,
  updateEstado: async (id, fields) => {
    cambiosEstado.push(fields.estado);
    return { id, estado: fields.estado };
  },
  update: async (id, fields) => {
    updates.push(fields);
    return { id };
  },
  getEtapas: async () => [],
  usuarioActivo: async () => true,
  getServicios: async () => [],
  getBitacora: async () => [],
  getFotos: async () => [],
  getProgreso: async () => null
});
stubModule('src/modules/visitas/recepciones.model.js', { findByVisitaId: async () => null });
stubModule('src/modules/inventario/inventario.model.js', { listProductosUsadosByVisita: async () => [] });
stubModule('src/modules/flujos/flujos.model.js', {
  flujoActivo: async () => true,
  inicializarEtapasVisita: async () => {}
});
stubModule('src/middlewares/uploadMiddleware.js', { cleanupUploadedFile: () => {} });

const { updateEstado, updateVisita } = require('../src/modules/visitas/visitas.controller');

const buildRes = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const callEstado = async (estado) => {
  const res = buildRes();
  await updateEstado({ params: { id: '7' }, body: { estado }, user: { id: 1 } }, res);
  return res;
};

beforeEach(() => {
  state = { estadoActual: 'Finalizado', tieneFactura: false };
  cambiosEstado = [];
  updates = [];
});

test('no permite marcar Entregado si la visita no tiene factura', async () => {
  const res = await callEstado('Entregado');

  assert.equal(res.statusCode, 400);
  assert.deepEqual(cambiosEstado, []);
});

test('permite marcar Entregado cuando ya existe la factura', async () => {
  state.tieneFactura = true;
  const res = await callEstado('Entregado');

  assert.equal(res.statusCode, 200);
  assert.deepEqual(cambiosEstado, ['Entregado']);
});

test('otros estados no exigen factura', async () => {
  const res = await callEstado('En prueba');

  assert.equal(res.statusCode, 200);
  assert.deepEqual(cambiosEstado, ['En prueba']);
});

test('la edicion de la visita tampoco permite entregar sin factura', async () => {
  const res = buildRes();
  await updateVisita({ params: { id: '7' }, body: { estado: 'Entregado' }, user: { id: 1 } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(updates, []);
});

test('editar una visita ya entregada no vuelve a exigir factura', async () => {
  state.estadoActual = 'Entregado';
  const res = buildRes();
  await updateVisita({ params: { id: '7' }, body: { estado: 'Entregado', observaciones: 'x' }, user: { id: 1 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updates.length, 1);
});
