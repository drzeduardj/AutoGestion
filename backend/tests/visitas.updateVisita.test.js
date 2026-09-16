const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Reemplaza un modulo en la cache de require para aislar el controlador de la base de datos.
const stubModule = (relativePath, exports) => {
  const id = require.resolve(path.join(__dirname, '..', relativePath));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

let state;
let inicializaciones;
let updates;

stubModule('src/modules/visitas/visitas.model.js', {
  findById: async (id) => (state.exists ? { id, flujo_trabajo_id: state.flujoActual } : null),
  update: async (id, fields) => {
    updates.push(fields);
    return { id };
  },
  getEtapas: async () => state.etapas,
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
  inicializarEtapasVisita: async (args) => {
    inicializaciones.push({ flujoTrabajoId: args.flujoTrabajoId, replace: args.replace });
  }
});
stubModule('src/middlewares/uploadMiddleware.js', { cleanupUploadedFile: () => {} });

const { updateVisita } = require('../src/modules/visitas/visitas.controller');

const callUpdate = async (body) => {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    }
  };

  await updateVisita({ params: { id: '7' }, body, user: { id: 1 } }, res);
  return res.statusCode;
};

beforeEach(() => {
  inicializaciones = [];
  updates = [];
});

test('editar una visita con el mismo flujo conserva el avance de etapas', async () => {
  state = { exists: true, flujoActual: 2, etapas: [{ id: 1 }] };

  const status = await callUpdate({ flujo_trabajo_id: 2, motivo_visita: 'Cambio de fecha' });

  assert.equal(status, 200);
  assert.deepEqual(inicializaciones, []);
});

test('el flujo enviado como texto se compara por valor', async () => {
  state = { exists: true, flujoActual: 2, etapas: [{ id: 1 }] };

  await callUpdate({ flujo_trabajo_id: '2' });

  assert.deepEqual(inicializaciones, []);
});

test('cambiar el flujo reinicia las etapas', async () => {
  state = { exists: true, flujoActual: 2, etapas: [{ id: 1 }] };

  await callUpdate({ flujo_trabajo_id: 3 });

  assert.deepEqual(inicializaciones, [{ flujoTrabajoId: 3, replace: true }]);
});

test('asignar flujo a una visita que no tenia inicializa las etapas', async () => {
  state = { exists: true, flujoActual: null, etapas: [] };

  await callUpdate({ flujo_trabajo_id: 3 });

  assert.deepEqual(inicializaciones, [{ flujoTrabajoId: 3, replace: true }]);
});

test('mismo flujo sin etapas creadas las inicializa sin borrar', async () => {
  state = { exists: true, flujoActual: 2, etapas: [] };

  await callUpdate({ flujo_trabajo_id: 2 });

  assert.deepEqual(inicializaciones, [{ flujoTrabajoId: 2, replace: false }]);
});

test('sin flujo en el formulario no toca las etapas', async () => {
  state = { exists: true, flujoActual: 2, etapas: [{ id: 1 }] };

  await callUpdate({ motivo_visita: 'Solo motivo' });

  assert.deepEqual(inicializaciones, []);
});

test('visita inexistente responde 404 sin guardar', async () => {
  state = { exists: false };

  const status = await callUpdate({ flujo_trabajo_id: 2 });

  assert.equal(status, 404);
  assert.deepEqual(updates, []);
  assert.deepEqual(inicializaciones, []);
});
