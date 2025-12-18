const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function cleanAndSeed() {
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

    console.log('\n🗑️  Limpiando datos existentes...');
    await client.query('DELETE FROM auth.asignaciones_usuario_estructura;');
    await client.query('DELETE FROM auth.unidades_organizacionales;');
    console.log('✓ Datos eliminados');

    const sqlFile = path.join(__dirname, 'migrations', '002-seed-estructura-organizacional.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('\n📥 Insertando datos nuevos...');
    console.log('Esto insertará 18 territoriales y 308 CETAP...');

    await client.query(sql);

    console.log('✓ Migración completada exitosamente');

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
    let totalRecords = 0;
    result.rows.forEach(row => {
      console.log(`  ${row.nivel.padEnd(12)} - Total: ${row.total}, Activas: ${row.activas}`);
      totalRecords += parseInt(row.total);
    });
    console.log(`\n✓ TOTAL: ${totalRecords} unidades organizacionales insertadas`);

    if (totalRecords === 326) {
      console.log('✅ ¡Todos los registros fueron insertados correctamente!');
    } else {
      console.log(`⚠️  Advertencia: Se esperaban 326 registros, pero se insertaron ${totalRecords}`);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.detail) {
      console.error('  Detalle:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanAndSeed();
