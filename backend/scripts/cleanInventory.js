// Limpieza de UN SOLO USO del inventario (productos), conservando las categorias.
// Uso: npm run clean:inventario  (desde /backend)  o  npm run clean:inventario (desde la raiz)
// NO es una migracion: se ejecuta manualmente cuando se quiere arrancar el inventario limpio.

require('dotenv').config();
const { pool } = require('../src/config/db');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Referencias a productos que deben limpiarse antes (FK RESTRICT).
    const movimientos = await client.query('DELETE FROM movimientos_inventario');
    const usados = await client.query('DELETE FROM visita_productos');
    // factura_lineas.producto_id es ON DELETE SET NULL: las facturas conservan el texto.
    const productos = await client.query('DELETE FROM productos');

    await client.query('ALTER SEQUENCE productos_id_seq RESTART WITH 1');

    await client.query('COMMIT');

    console.log('Inventario limpiado (categorias de producto conservadas):');
    console.log(`  productos eliminados:              ${productos.rowCount}`);
    console.log(`  movimientos de inventario borrados: ${movimientos.rowCount}`);
    console.log(`  usos de producto en visitas:        ${usados.rowCount}`);
    console.log('  IDs de producto reiniciados (proximo = 1).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error, no se hizo ningun cambio:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
