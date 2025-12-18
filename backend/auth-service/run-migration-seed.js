const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSeedMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'esap_db',
  });

  try {
    await client.connect();
    console.log('✓ Conectado a la base de datos');

    const sqlFile = path.join(__dirname, 'migrations', '002-seed-estructura-organizacional.sql');

    if (!fs.existsSync(sqlFile)) {
      console.error('✗ Archivo no encontrado:', sqlFile);
      console.log('  Ejecuta primero: node generate-seed-data.js');
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Ejecutando migración: 002-seed-estructura-organizacional.sql');
    console.log('Esto insertará 18 territoriales y 308 CETAP...');

    await client.query(sql);

    console.log('✓ Migración completada exitosamente');
    console.log('✓ Datos insertados:');
    console.log('  - 1 Sede Central (nacional)');
    console.log('  - 17 Territoriales');
    console.log('  - 308 CETAP');
    console.log('  - TOTAL: 326 unidades organizacionales');

    // Verificar inserción
    console.log('\n📊 Verificando datos insertados...');
    const result = await client.query(`
      SELECT
        nivel,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'activa' THEN 1 END) as activas
      FROM auth.unidades_organizacionales
      GROUP BY nivel
      ORDER BY
        CASE nivel
          WHEN 'nacional' THEN 1
          WHEN 'territorial' THEN 2
          WHEN 'cetap' THEN 3
          ELSE 4
        END;
    `);

    console.log('\nResumen por nivel:');
    result.rows.forEach(row => {
      console.log(`  ${row.nivel.padEnd(12)} - Total: ${row.total}, Activas: ${row.activas}`);
    });

  } catch (error) {
    console.error('✗ Error en la migración:', error.message);
    if (error.detail) {
      console.error('  Detalle:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeedMigration();
