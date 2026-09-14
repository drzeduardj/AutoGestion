// Punto de entrada para Vercel: la API Express corre como Serverless Function.
// El servidor tradicional (backend/src/server.js) se sigue usando en instalaciones locales.
module.exports = require('../backend/src/app');
