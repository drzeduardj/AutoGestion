const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Reemplaza un modulo en la cache de require para aislar el controlador de la base de datos.
const stubModule = (relativePath, exports) => {
  const id = require.resolve(path.join(__dirname, '..', relativePath));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

stubModule('src/modules/visitas/recepciones.model.js', {});
stubModule('src/modules/visitas/visitas.model.js', {});

const { resolverTipoDiagrama } = require('../src/modules/visitas/recepciones.controller');

test('sin recepcion usa el tipo del vehiculo', () => {
  assert.equal(resolverTipoDiagrama(null, 'pickup'), 'pickup');
});

test('vehiculo sin tipo usa el diagrama de turismo', () => {
  assert.equal(resolverTipoDiagrama(null, null), 'turismo');
});

test('recepcion con danos conserva el diagrama sobre el que se marcaron', () => {
  const recepcion = { tipo_diagrama: 'turismo', danos: { cofre: { tipos: ['G'] } } };

  assert.equal(resolverTipoDiagrama(recepcion, 'pickup'), 'turismo');
});

test('recepcion sin danos sigue el tipo actual del vehiculo', () => {
  const recepcion = { tipo_diagrama: 'turismo', danos: {} };

  assert.equal(resolverTipoDiagrama(recepcion, 'camioneta'), 'camioneta');
});
