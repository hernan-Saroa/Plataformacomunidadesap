const { Client } = require('pg');
require('dotenv').config();

async function checkData() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'esap_db',
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT nivel, COUNT(*) as total
      FROM auth.unidades_organizacionales
      GROUP BY nivel
      ORDER BY
        CASE nivel
          WHEN 'nacional' THEN 1
          WHEN 'territorial' THEN 2
          WHEN 'cetap' THEN 3
        END;
    `);

    console.log('\n📊 Registros en la base de datos:');
    console.log('================================');
    let totalRecords = 0;
    result.rows.forEach(row => {
      console.log(`${row.nivel.padEnd(15)} ${row.total} registros`);
      totalRecords += parseInt(row.total);
    });
    console.log('================================');
    console.log(`TOTAL:          ${totalRecords} registros\n`);

    // Verificar códigos duplicados
    const duplicates = await client.query(`
      SELECT codigo, COUNT(*) as count
      FROM auth.unidades_organizacionales
      GROUP BY codigo
      HAVING COUNT(*) > 1;
    `);

    if (duplicates.rows.length > 0) {
      console.log('⚠️  Códigos duplicados encontrados:');
      duplicates.rows.forEach(row => {
        console.log(`  ${row.codigo}: ${row.count} veces`);
      });
    } else {
      console.log('✓ No hay códigos duplicados');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkData();
