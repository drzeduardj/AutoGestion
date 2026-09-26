const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Reemplaza un modulo en la cache de require para aislar el controlador de la base de datos.
const stubModule = (relativePath, exports) => {
  const id = require.resolve(path.join(__dirname, '..', relativePath));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

const TX_CLIENT = { name: 'cliente de la transaccion' };

let state;
let inicializaciones;

stubModule('src/modules/visitas/visitas.model.js', {
  // Simula la transaccion del modelo: afterInsert recibe el mismo client.
  create: async (_payload, _servicios, { afterInsert } = {}) => {
    if (afterInsert) await afterInsert(TX_CLIENT, 11);
    return { id: 11 };
  },
  findById: async (id) => ({ id }),
  vehiculoPerteneceCliente: async () => true,
  usuarioActivo: async () => true,
  servicioActivo: async () => true,
  getServicios: async () => [],
  getBitacora: async () => [],
  getFotos: async () => [],
  getEtapas: async () => [],
  getProgreso: async () => null
});
stubModule('src/modules/visitas/recepciones.model.js', {
  findByVisitaId: async () => {
    if (state.recepcionFalla) throw new Error('no existe la columna vr.danos');
    return null;
  }
});
stubModule('src/modules/inventario/inventario.model.js', { listProductosUsadosByVisita: async () => [] });
stubModule('src/modules/flujos/flujos.model.js', {
  flujoActivo: async () => true,
  inicializarEtapasVisita: async (args) => {
    inicializaciones.push({ flujoTrabajoId: args.flujoTrabajoId, client: args.client });
  }
});
stubModule('src/middlewares/uploadMiddleware.js', { cleanupUploadedFile: () => {} });

const { createVisita } = require('../src/modules/visitas/visitas.controller');

const callCreate = async (body) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  await createVisita({ body: { cliente_id: 1, vehiculo_id: 2, motivo_visita: 'Prueba', ...body }, user: { id: 1 } }, res);
  return res;
};

beforeEach(() => {
  state = { recepcionFalla: false };
  inicializaciones = [];
});

test('las etapas del flujo se crean dentro de la transaccion de la visita', async () => {
  const res = await callCreate({ flujo_trabajo_id: 3 });

  assert.equal(res.statusCode, 201);
  assert.deepEqual(inicializaciones, [{ flujoTrabajoId: 3, client: TX_CLIENT }]);
});

test('sin flujo no inicializa etapas', async () => {
  await callCreate({});

  assert.deepEqual(inicializaciones, []);
});

test('si falla la lectura del detalle, la visita creada igual responde 201', async () => {
  state.recepcionFalla = true;
  const originalError = console.error;
  console.error = () => {};

  try {
    const res = await callCreate({});

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.data.visita.id, 11);
  } finally {
    console.error = originalError;
  }
});
